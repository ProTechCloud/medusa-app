/**
 * Stands in for `dotenv` in the `app.config.ts` tests. The env file holds
 * what a test gives `mockEnvFile`, or is missing when it gives `null`, and
 * `mockLocalEnvFile` does the same for the `.local` one; the files on disk
 * are never read. `config` writes into `processEnv` and keeps a value already
 * there, as dotenv does, and `mockEnvFileRead` says which file the config
 * asked for last.
 */
let file: Record<string, string> | null = null;
let localFile: Record<string, string> | null = null;
let read: string | undefined;

export function mockEnvFile(values: Record<string, string> | null): void {
	file = values;
}

export function mockLocalEnvFile(values: Record<string, string> | null): void {
	localFile = values;
}

export function mockEnvFileRead(): string | undefined {
	return read;
}

function config(options: {
	path: string;
	processEnv?: Record<string, string>;
}): { parsed?: Record<string, string>; error?: Error } {
	read = options.path;
	const values = options.path.endsWith(".local") ? localFile : file;
	if (!values) return { error: new Error(`ENOENT: ${options.path}`) };
	const target = options.processEnv ?? process.env;
	for (const [name, value] of Object.entries(values)) {
		target[name] ??= value;
	}
	return { parsed: { ...values } };
}

export default { config };
