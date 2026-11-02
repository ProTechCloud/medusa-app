/**
 * Stands in for `node:fs` in the `app.config.ts` tests: the one file
 * `mockExistingFile` names is on the Mac, and the disk is never read.
 */
let existing: string | null = null;

export function mockExistingFile(name: string | null): void {
	existing = name;
}

export function existsSync(path: string): boolean {
	return existing !== null && path.endsWith(`/${existing}`);
}
