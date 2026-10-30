import { vi } from "vitest";
import type { TVersion } from "@/use-cases/cases/load-version.use-case";

/**
 * Stands in for `loadVersionUseCase`. A test wires it with
 * `vi.mock("@/use-cases/cases/load-version.use-case", () => import(<this file>))`
 * and sets the result per case with `mockResolvedValue`. Until it does, the
 * mock rejects, so a test that forgot fails instead of passing on `undefined`.
 * `mockReset` in `vitest.config.ts` brings the rejection back before every
 * test, so one test's result never leaks into the next.
 */
export const loadVersionUseCase = vi.fn(async (): Promise<TVersion> => {
	throw new Error("loadVersionUseCase mock: the test set no result");
});
