import {
	create,
	type StateCreator,
	type StoreApi,
	type UseBoundStore,
} from "zustand";

/**
 * Whose data a store holds. A `member` store holds the signed-in member's
 * data and is cleared at sign-out; a `device` store holds settings that
 * outlive a session.
 */
type TStoreScope = "member" | "device";

const registered: Array<{ scope: TStoreScope; reset: () => void }> = [];

/**
 * Create a zustand store the app can reset. Every store goes through this,
 * never `create` directly, so sign-out and tests can return each one to the
 * state it started with.
 */
// fallow-ignore-next-line unused-export -- the first store arrives with the first feature that keeps state
export function createAppStore<TState extends object>(
	scope: TStoreScope,
	initializer: StateCreator<TState>,
): UseBoundStore<StoreApi<TState>> {
	const store = create<TState>()(initializer);
	const initial = store.getState();
	registered.push({ scope, reset: () => store.setState(initial, true) });
	return store;
}

/** Sign-out: forget the member's data, keep the device's settings. */
// fallow-ignore-next-line unused-export -- sign-out arrives with auth
export function resetMemberStores(): void {
	for (const store of registered) if (store.scope === "member") store.reset();
}

/** Tests: start every store from its initial state. */
export function resetAllStores(): void {
	for (const store of registered) store.reset();
}
