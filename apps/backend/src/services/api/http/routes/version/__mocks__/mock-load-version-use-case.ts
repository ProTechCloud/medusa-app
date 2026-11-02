import { vi } from "vitest";
import type { TVersion } from "@/use-cases/cases/load-version.use-case";

/**
 * Stands in for the `load-version.use-case` module. A test wires it with
 * `vi.mock("@/use-cases/cases/load-version.use-case", async () => (await import(<this file>)).mockLoadVersionUseCase())`
 * and sets the result per case with `mockResolvedValue`, or passes an
 * override for the whole file. Until it does, `loadVersionUseCase` rejects,
 * so a test that forgot fails instead of passing on `undefined`.
 * `mockReset` in `vitest.config.ts` brings the rejection back before every
 * test, so one test's result never leaks into the next.
 */
export function mockLoadVersionUseCase(
	overrides: { loadVersionUseCase?: () => Promise<TVersion> } = {},
) {
	return {
		loadVersionUseCase: vi.fn(
			overrides.loadVersionUseCase ??
				(async (): Promise<TVersion> => {
					throw new Error("loadVersionUseCase mock: the test set no result");
				}),
		),
	};
}
