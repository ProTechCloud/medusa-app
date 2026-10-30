import pino from "pino";
import { z } from "zod";
import { parseEnv } from "@/shared/env";

const schema = z.object({
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
		.default("info"),
	// `pretty` is for a terminal; pino-pretty is a dev dependency, so the image
	// only ever logs JSON, which Cloud Logging parses into fields.
	LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
});

// Parsed at import, before anything can log. It reads only its own two
// variables; everything else comes from `@/config`.
const env = parseEnv(schema, process.env);

/**
 * The process logger. Every line carries `time` as ISO 8601 in UTC and
 * `level` by name (`"info"`, not `30`), so a line reads the same in a
 * terminal, in Cloud Logging and in a test.
 */
export const logger = pino({
	level: env.LOG_LEVEL,
	timestamp: pino.stdTimeFunctions.isoTime,
	formatters: {
		level: (label) => ({ level: label }),
	},
	...(env.LOG_FORMAT === "pretty" && {
		transport: { target: "pino-pretty" },
	}),
});
