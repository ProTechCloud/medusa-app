import { afterEach, beforeEach } from "vitest";
import { generateUseCaseContext } from "@/shared/__mocks__/generate-use-case-context";
import { resetCtx, setCtxForTests, type TUseCaseContext } from "@/use-cases";

/**
 * Register a fresh use-case context before each test in the calling file and
 * drop it after, so no test sees another's config or logger. Pass overrides
 * for the fields a test is about.
 */
export function useCaseContextForEachTest(
	overrides: () => Partial<TUseCaseContext> = () => ({}),
): void {
	beforeEach(() => {
		setCtxForTests({ ...generateUseCaseContext(), ...overrides() });
	});
	afterEach(() => resetCtx());
}
