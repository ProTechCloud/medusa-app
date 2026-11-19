import { vi } from "vitest";

/**
 * A push's body reader, for tests that check whether it is read: it answers
 * as a body that is not JSON would.
 */
export function mockReadBody() {
	return vi.fn(async (): Promise<unknown> => null);
}
