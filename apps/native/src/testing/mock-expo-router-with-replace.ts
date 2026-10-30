/**
 * An `expo-router` whose navigation a test can read. A test that needs to
 * assert where a screen sent the user wires it with
 * `jest.mock("expo-router", () => require("@/testing/mock-expo-router-with-replace"))`
 * and checks `mockReplace`, `mockPush` or `mockBack`.
 */
export const mockReplace = jest.fn();
export const mockPush = jest.fn();
export const mockBack = jest.fn();

export const Redirect = jest.fn(() => null);

// The imperative `router`, for screens that import it directly.
export const router = {
	push: mockPush,
	replace: mockReplace,
	back: mockBack,
};

export const useRouter = () => router;

// Runs the focus callback on mount, as the screen gaining focus, and its
// cleanup on unmount.
export const useFocusEffect = (effect: () => undefined | (() => void)) => {
	const { useEffect } = require("react");
	useEffect(() => effect(), [effect]);
};
