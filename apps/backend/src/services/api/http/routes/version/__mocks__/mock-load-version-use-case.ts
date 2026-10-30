import { vi } from "vitest";

/**
 * Stands in for `loadVersionUseCase`. A test wires it with
 * `vi.mock("@/use-cases/cases/load-version.use-case", () => import(<this file>))`
 * and sets the result per case with `mockResolvedValue`.
 */
export const loadVersionUseCase = vi.fn();
