/**
 * Stands in for `dotenv` in the `app.config.ts` tests. The env file holds
 * what a test gives `mockEnvFile`, or is missing when it gives `null`; the
 * file on disk is never read. `config` writes into `processEnv`, as dotenv
 * does, and `mockEnvFileRead` says which file the config asked for.
 */
let file: Record<string, string> | null = null;
let read: string | undefined;

export function mockEnvFile(values: Record<string, string> | null): void {
	file = values;
}

export function mockEnvFileRead(): string | undefined {
	return read;
}

function config(options: {
	path: string;
	processEnv?: Record<string, string>;
}): { parsed?: Record<string, string>; error?: Error } {
	read = options.path;
	if (!file) return { error: new Error(`ENOENT: ${options.path}`) };
	Object.assign(options.processEnv ?? process.env, file);
	return { parsed: { ...file } };
}

export default { config };
