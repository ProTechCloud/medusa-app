# Context

Where a React context in `apps/native` lives and where its provider is wired. The app has
no context yet; these rules place the first one.

Paths below are under `apps/native/`.

## Every context is a folder with `index.ts` or `index.tsx`

The provider and the hook that reads it live together in the folder's `index.tsx`, and the
folder is named after the context in kebab-case. A helper only that context uses is in its
`lib/`, as for a [hook](./hooks.md).

## One consumer colocates, several share

By the [placement rule](../../style-guide/placement-rule.md):

- A context one screen uses lives under that screen's folder, beside its `hooks/`.
- A context several screens use lives in `src/shared/context/<context>/`. That folder holds
  nothing yet; the first shared context will go there.

## A provider is wired in the root layout

A provider the whole app needs is defined in its folder and wired in `src/app/_layout.tsx`,
around the `Stack`, as [Project Structure](./project-structure.md) describes. It is never
buried inside a screen or a component.

## A hook over a platform API stays small, so a test can mock it

A context that reads an Expo or React Native API wraps it in a small hook of its own, as
[Hooks](./hooks.md) describes, so a test mocks that one hook.

## No navigation or side effects hidden in helpers

A context's `lib/` computes and returns. Navigating, fetching and writing state happen in
the provider or a named hook, where a reader looks for them.
