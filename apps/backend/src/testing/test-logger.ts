import pino, { type Logger } from "pino";

/** A logger that writes nowhere, for contexts whose logs a test does not read. */
export const testLogger: Logger = pino({ level: "silent" });

/**
 * A logger that keeps every line it writes, parsed, so a test can assert on
 * what was logged instead of spying on pino's methods.
 */
export function createCapturingLogger(): {
	logger: Logger;
	lines: () => Array<Record<string, unknown>>;
} {
	const written: string[] = [];
	const logger = pino(
		{ level: "trace" },
		{ write: (chunk: string) => written.push(chunk) },
	);
	return {
		logger,
		lines: () => written.map((chunk) => JSON.parse(chunk)),
	};
}
