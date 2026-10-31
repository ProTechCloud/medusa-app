/** A pino destination that keeps every line it receives, parsed, for a test to read. */
export function createCapturingStream(): {
	stream: { write: (line: string) => void };
	lines: () => Array<Record<string, unknown>>;
} {
	const written: string[] = [];
	return {
		stream: { write: (line) => written.push(line) },
		lines: () => written.map((line) => JSON.parse(line)),
	};
}
