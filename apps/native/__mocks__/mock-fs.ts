/**
 * Stands in for `node:fs` in the `app.config.ts` tests: `mockCliFileExists`
 * says whether `.env.dev.local` is on the Mac, and the disk is never read.
 */
let cliFileExists = false;

export function mockCliFileExists(exists: boolean): void {
	cliFileExists = exists;
}

export function existsSync(path: string): boolean {
	return cliFileExists && path.endsWith(".env.dev.local");
}
