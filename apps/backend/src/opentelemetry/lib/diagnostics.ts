import { type DiagLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { z } from "zod";
import { parseEnv } from "@/shared/env";

const LEVELS = {
	none: DiagLogLevel.NONE,
	error: DiagLogLevel.ERROR,
	warn: DiagLogLevel.WARN,
	info: DiagLogLevel.INFO,
	debug: DiagLogLevel.DEBUG,
	verbose: DiagLogLevel.VERBOSE,
	all: DiagLogLevel.ALL,
} as const;

const schema = z.object({
	OTEL_LOG_LEVEL: z
		.string()
		.transform((value) => value.toLowerCase())
		.pipe(z.enum(Object.keys(LEVELS) as [keyof typeof LEVELS]))
		.default("warn"),
});

/**
 * One JSON line on stderr per message. Not through the app's logger: the
 * logger hands its lines to this SDK, so a problem in the SDK reported there
 * could loop.
 */
function writeLine(level: string, message: string, args: unknown[]): void {
	process.stderr.write(
		`${JSON.stringify({
			time: new Date().toISOString(),
			level,
			source: "opentelemetry",
			msg: message,
			...(args.length > 0 ? { args: args.map(String) } : {}),
		})}\n`,
	);
}

const stderrLogger: DiagLogger = {
	error: (message, ...args) => writeLine("error", message, args),
	warn: (message, ...args) => writeLine("warn", message, args),
	info: (message, ...args) => writeLine("info", message, args),
	debug: (message, ...args) => writeLine("debug", message, args),
	verbose: (message, ...args) => writeLine("trace", message, args),
};

/**
 * Report the SDK's own problems — an export that failed, a bad option — at
 * `OTEL_LOG_LEVEL`, `warn` unless set.
 */
export function enableDiagnostics(
	env: Record<string, string | undefined>,
): void {
	const { OTEL_LOG_LEVEL } = parseEnv(schema, env);
	// The SDK installs a console logger of its own when OTEL_LOG_LEVEL is set;
	// replacing it is the point, so the notice saying so is left out.
	diag.setLogger(stderrLogger, {
		logLevel: LEVELS[OTEL_LOG_LEVEL],
		suppressOverrideMessage: true,
	});
}
