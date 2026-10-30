/**
 * An `expo-router` whose navigation a test can read and steer. A test that
 * needs to assert where a screen sent the user, or to render a screen at a
 * path with params, wires it with
 * `jest.mock("expo-router", () => require("@/testing/mock-expo-router-with-replace"))`
 * and checks `mockReplace`, `mockPush`, `mockNavigate` or `mockBack`, sets
 * `mockPathname` and `mockSearchParams`, or calls `mockRefocus`.
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

const focused = new Set<() => void>();

// Runs the focus callback on mount, as the screen gaining focus, and its
// cleanup on unmount or when `mockRefocus` blurs the screen.
export const useFocusEffect = (effect: () => undefined | (() => void)) => {
	const { useEffect, useState } = require("react");
	const [visit, setVisit] = useState(0);
	useEffect(() => {
		const refocus = () => setVisit((count: number) => count + 1);
		focused.add(refocus);
		return () => focused.delete(refocus);
	}, []);
	// `visit` changes on each refocus, which re-runs the effect.
	useEffect(() => effect(), [effect, visit]);
};

/**
 * Every mounted screen loses focus and gains it again, as when the user
 * leaves a tab and comes back: its focus cleanup runs, then its callback.
 * Call it inside `act`.
 */
export function mockRefocus(): void {
	for (const refocus of focused) refocus();
}
