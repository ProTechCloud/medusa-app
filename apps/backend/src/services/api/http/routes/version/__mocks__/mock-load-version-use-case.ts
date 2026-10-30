import { vi } from "vitest";

/**
 * Stands in for `loadVersionUseCase`. A test wires it with
 * `vi.mock("@/use-cases/cases/load-version.use-case", () => import(<this file>))`
 * and sets the result per case with `mockResolvedValue`. Until it does, the
 * mock rejects, so a test that forgot fails instead of passing on `undefined`.
 */
export const loadVersionUseCase = vi
	.fn()
	.mockRejectedValue(
		new Error("loadVersionUseCase mock: the test set no result"),
	);
