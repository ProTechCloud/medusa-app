import pino, { type DestinationStream, type Level, type Logger } from "pino";
import { z } from "zod";
import { getConfig } from "@/config";
import { correlationFields } from "@/opentelemetry/lib/log-correlation";
import { createLogRecordStream } from "@/opentelemetry/lib/log-record-stream";
import { getPostHogConfig, requestIdentityLogFields } from "@/posthog";
import { parseEnv } from "@/shared/env";

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;

const schema = z.object({
	LOG_LEVEL: z.enum([...LEVELS, "silent"]).default("info"),
	// `pretty` is for a terminal; pino-pretty is a dev dependency, so the image
	// sets NODE_ENV=production and only ever logs JSON, which Cloud Logging
	// parses into fields.
	LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
	NODE_ENV: z.string().optional(),
	// Lines to stdout, for Cloud Logging and a terminal. Off only where
	// PostHog alone should have them.
	LOG_STDOUT: z.stringbool().default(true),
	// The lowest level sent to PostHog, when it receives logs at all.
	LOG_POSTHOG_LEVEL: z.enum(LEVELS).default("warn"),
});

// Every field whose value could be a credential or a person: the names
// themselves at the top of a line, and one level down, inside an object
// logged under another name.
const REDACTED_KEYS = [
	"password",
	"newPassword",
	"currentPassword",
	"token",
	"accessToken",
	"refreshToken",
	"idToken",
	"pushToken",
	"authorization",
	"cookie",
	"email",
];
const REDACT_PATHS = REDACTED_KEYS.flatMap((key) => [key, `*.${key}`]);

/**
 * A logger with the line shape every line shares: `time` as ISO 8601 in UTC,
 * `level` by name (`"info"`, not `30`), the `base` fields, the request's
 * correlation and PostHog identity fields, and credentials replaced by
 * `[redacted]`. It writes to every stream given, each from its own level up.
 */
export function createLogger(options: {
	base: Record<string, string>;
	streams: Array<{ level: Level; stream: DestinationStream }>;
	level: Level | "silent";
}): Logger {
	return pino(
		{
			level: options.level,
			base: options.base,
			timestamp: pino.stdTimeFunctions.isoTime,
			formatters: {
				level: (label) => ({ level: label }),
			},
			mixin: () => ({ ...correlationFields(), ...requestIdentityLogFields() }),
			redact: { paths: REDACT_PATHS, censor: "[redacted]" },
		},
		pino.multistream(options.streams),
	);
}

// Parsed at import, before anything can log.
const env = parseEnv(schema, process.env);
const config = getConfig();
const format =
	env.LOG_FORMAT ?? (env.NODE_ENV === "production" ? "json" : "pretty");
const posthog = getPostHogConfig();

const streams: Array<{ level: Level; stream: DestinationStream }> = [];
if (env.LOG_STDOUT && env.LOG_LEVEL !== "silent") {
	// Both stdout destinations write in-process and synchronously. A pino
	// `transport` runs in a worker thread, which has misbehaved under Bun, and
	// a crash could lose the last lines still queued for it. pino-pretty is
	// imported only when asked for, so the image, which does not ship it,
	// never loads it.
	streams.push({
		level: env.LOG_LEVEL,
		stream:
			format === "pretty"
				? (await import("pino-pretty")).default({ sync: true })
				: pino.destination({ dest: 1, sync: true }),
	});
}
if (posthog?.logs) {
	streams.push({
		level: env.LOG_POSTHOG_LEVEL,
		stream: createLogRecordStream(config.service),
	});
}

// The logger runs at the lowest level any stream wants; each stream keeps
// only its own levels and up.
const RANK = Object.fromEntries(
	LEVELS.map((level, index) => [level, LEVELS.length - index]),
) as Record<Level, number>;
const lowest = streams.reduce<Level | "silent">(
	(level, entry) =>
		level === "silent" || RANK[entry.level] < RANK[level] ? entry.level : level,
	"silent",
);

/** The process logger. */
export const logger: Logger = createLogger({
	base: {
		service: config.service,
		environment: config.environment,
		version: config.version,
	},
	streams,
	level: lowest,
});

/**
 * Write the exception that is about to end the process, before Node or Bun
 * prints it and exits, so the last line in the logs, and in PostHog, says
 * why.
 */
function logCrash(error: Error, origin: string): void {
	logger.fatal({ err: error, origin }, "crashed");
}

process.on("uncaughtExceptionMonitor", logCrash);
