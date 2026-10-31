# Hooks

Where a hook in `apps/native` lives and what it may hide. State held in a hook is covered by
[State](./state.md).

Paths below are under `apps/native/`.

## Every hook is a folder with `index.ts` or `index.tsx`

The hook lives in the folder's `index.ts`, or `index.tsx` when it renders JSX, and the folder
is named after the hook in kebab-case: `src/screens/home/hooks/use-api-version/index.ts`
exports `useApiVersion`. A helper only that hook uses is in its `lib/`, as
`src/screens/home/hooks/use-api-version/lib/version-schema.ts` is; a hook only another hook
uses nests inside that hook's folder.

## One consumer colocates, several share

By the [placement rule](../../style-guide/placement-rule.md):

- A hook one screen uses lives under that screen's `hooks/`. `useApiVersion` is used by
  Home alone, so it is in `src/screens/home/hooks/use-api-version/`.
- A hook several screens use lives in `src/shared/hooks/<hook>/`. That folder holds nothing
  yet; the first shared hook will go there.

## A hook over a platform API stays small, so a test can mock it

A hook that reads an Expo or React Native API, such as permissions, the keyboard, app state
or deep links, wraps that API and nothing more. A test then mocks the one wrapper instead
of the platform module everywhere it is used. `src/shared/splash-screen/index.ts` is the
shape, though it is a module rather than a hook: two functions over `expo-splash-screen`,
which the root layout calls and no screen imports.

## No navigation or side effects hidden in helpers

A helper in `lib/` computes and returns; it does not navigate, fetch, write to a store or
call a platform API. Those belong to a named hook or the screen, where a reader looks for
them. `version-schema.ts` only parses: the request, the timeout and the state are in
`useApiVersion` itself.
