/**
 * An `expo-router` whose navigation a test can read and steer. A test that
 * needs to assert where a screen sent the user, or to render a screen at a
 * path with params, wires it with
 * `jest.mock("expo-router", () => require("@/testing/mock-expo-router-with-replace"))`
 * and checks `mockReplace`, `mockPush`, `mockNavigate` or `mockBack`, sets
 * `mockPathname` and `mockSearchParams`, or calls `mockBlur` and `mockFocus`.
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

const screens = new Set<(focused: boolean) => void>();

// Runs the focus callback on mount, as the screen gaining focus, and its
// cleanup on unmount or when `mockBlur` takes the focus away. `mockFocus`
// runs the callback again.
export const useFocusEffect = (effect: () => undefined | (() => void)) => {
	const { useEffect, useState } = require("react");
	const [focus, setFocus] = useState({ focused: true, visit: 0 });
	useEffect(() => {
		const set = (focused: boolean) =>
			setFocus((previous: { visit: number }) => ({
				focused,
				visit: previous.visit + 1,
			}));
		screens.add(set);
		return () => screens.delete(set);
	}, []);
	// `focus` changes on each blur and focus, which re-runs the effect.
	useEffect(() => (focus.focused ? effect() : undefined), [effect, focus]);
};

/**
 * Every mounted screen loses focus, as when the user leaves its tab: its
 * focus cleanup runs. Call it inside `act`.
 */
export function mockBlur(): void {
	for (const set of screens) set(false);
}

/**
 * Every mounted screen gains focus again, as when the user comes back to its
 * tab: its focus callback runs. Call it inside `act`, after `mockBlur`.
 */
export function mockFocus(): void {
	for (const set of screens) set(true);
}
