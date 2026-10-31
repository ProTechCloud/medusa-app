# State

Where the native app in `apps/native` keeps state, and who may change it. The app holds no
store yet; these rules shape the first one.

Paths below are under `apps/native/`.

## State lives in Zustand stores, one per concern

Each store holds one concern, such as the signed-in member or the device's settings, with
the actions that change it beside the state, in the same store. Each lives in
`src/shared/stores/<store>/index.ts`; that folder holds nothing yet, and the first store
will go there.

## Every store is made with `createAppStore(scope, initializer)`

`createAppStore` in `src/shared/zustand/index.ts` creates the store and registers it for a
reset. A store never calls zustand's `create` directly, or no reset reaches it.
`src/shared/zustand/__tests__/index.test.ts` makes one store of each scope:

```ts
const memberStore = createAppStore<TValueState>("member", (set) => ({
	value: faker.lorem.word(),
	setValue: (value) => set({ value }),
}));
```

## `member` stores clear at sign-out, `device` stores stay

The scope says whose data a store holds:

| Scope    | Holds                           | Reset by                                   |
| -------- | ------------------------------- | ------------------------------------------ |
| `member` | the signed-in member's data     | `resetMemberStores()`, at sign-out         |
| `device` | settings that outlive a session | never by sign-out; `resetAllStores()` only |

## Every store resets before each test

`src/testing/mocks.ts` calls `resetAllStores()` in a `beforeEach`, so every test starts each
store from its initial state and no test sees what another left behind.

## No `useState` or `useReducer` in screens, components or hooks

A screen, component or hook reads state from a store and changes it through the store's
actions. The one exception today is `useApiVersion` in
`src/screens/home/hooks/use-api-version/index.ts`, which keeps what the API answered in
`useState`.

## A hook over a store is a view

A hook that reads a store selects the values its screen shows, words errors with i18n and
navigates. It does not hold state of its own or change the store's data except through the
store's actions.

## `useRef` only for view handles and values that don't render

A ref holds a handle on a view, or a value the screen never shows. `useApiVersion` keeps the
request in flight in `useRef`, because it decides which answer may set the state and is
never rendered. A value the screen shows is state, in a store.

## Derived values are selectors

A value computed from the state, such as a count or a filtered list, is a selector over the
store, read where it is needed. It is never stored beside the values it comes from, where
the two could disagree.

## State changes in actions, because something happened

An action changes the state because something happened: a press, an answer, a sign-out. A
`useEffect` that watches a value and writes another into the store is not an action; the
write belongs in the action that changed the first value.
