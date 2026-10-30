/**
 * An `expo-router` whose navigation a test can read and steer. A test that
 * needs to assert where a screen sent the user, or to render a screen at a
 * path with params, wires it with
 * `jest.mock("expo-router", () => require("@/testing/mock-expo-router-with-replace"))`
 * and checks `mockReplace`, `mockPush`, `mockNavigate` or `mockBack`, or sets
 * `mockPathname` and `mockSearchParams`.
 */
export const mockReplace = jest.fn();
export const mockPush = jest.fn();
export const mockNavigate = jest.fn();
export const mockBack = jest.fn();

/** What `usePathname` answers; a test sets it with `mockReturnValue`. */
export const mockPathname = jest.fn(() => "/");

/** What `useLocalSearchParams` answers; a test sets it with `mockReturnValue`. */
export const mockSearchParams = jest.fn(
	(): Record<string, string | string[]> => ({}),
);

export const Redirect = jest.fn(() => null);

// The imperative `router`, for screens that import it directly.
export const router = {
	push: mockPush,
	replace: mockReplace,
	navigate: mockNavigate,
	back: mockBack,
};

export const useRouter = () => router;

export const usePathname = () => mockPathname();

export const useLocalSearchParams = () => mockSearchParams();

// Runs the focus callback on mount, as the screen gaining focus, and its
// cleanup on unmount.
export const useFocusEffect = (effect: () => undefined | (() => void)) => {
	const { useEffect } = require("react");
	useEffect(() => effect(), [effect]);
};
