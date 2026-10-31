# Components

How a component in `apps/native` is laid out, built and styled. The files Expo owns are not
components; [Project Structure](./project-structure.md) covers them.

Paths below are under `apps/native/`.

## Every reusable component is a folder with `index.tsx`

The component lives in `index.tsx`, and its folder name is the component's name in
kebab-case: `src/shared/components/primary-button/index.tsx` exports `PrimaryButton`. Its
tests are in the folder's `__tests__/`, its mocks in `__mocks__/`, as
`src/shared/components/primary-button/__tests__/index.test.tsx` and
`src/shared/components/primary-button/__mocks__/mock-press-handler.ts` are.

## Sibling files are sub-components, in kebab-case

A file beside the `index.tsx` is a sub-component only that folder's component uses, named in
kebab-case. Once a second component needs it, it becomes a folder of its own, by the
[placement rule](../../style-guide/placement-rule.md).

## No bare `.tsx` in `screens/`, `shared/components/` or `shared/`

A component is never a loose file at those levels:

```text
# good — a component in its folder
src/shared/components/card/index.tsx

# bad — a loose component
src/shared/components/card.tsx
src/screens/home/api-card.tsx
```

## Build with React Native primitives and `StyleSheet`, reusing what exists

Components are made of React Native's `View`, `Text`, `Pressable`, `ScrollView` and the
rest, styled with `StyleSheet.create` at module level. Before writing a new one, reuse:

| Component         | File                                               | What it is                                               |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `ScreenContainer` | `src/shared/components/screen-container/index.tsx` | every screen's frame: safe area, scroll, title           |
| `Card`            | `src/shared/components/card/index.tsx`             | a titled group of related content                        |
| `ListRow`         | `src/shared/components/list-row/index.tsx`         | a label and its value, one per row                       |
| `PrimaryButton`   | `src/shared/components/primary-button/index.tsx`   | the main action: `solid`, `outline`, `danger`, `loading` |
| `Icon`            | `src/shared/vector-icons/index.tsx`                | the one icon set, Ionicons                               |

`src/screens/home/index.tsx` builds Home from `ScreenContainer`, `Card`, `ListRow` and
`PrimaryButton` alone.

## Every colour, spacing, radius and font size is a role from `src/shared/theme`

`src/shared/theme/index.ts` exports `colors`, `spacing`, `fontSizes`, `radii` and
`iconSizes`. A style asks for a role, never a raw value:

```tsx
// good — src/shared/components/card/index.tsx
card: {
	gap: spacing.sm,
	padding: spacing.md,
	borderRadius: radii.md,
	borderColor: colors.border,
	backgroundColor: colors.surface,
},

// bad — a value no other screen can follow
card: { padding: 14, borderColor: "#E5E7EB" },
```

A colour role names what the colour is for (`text`, `textMuted`, `danger`), not what it
looks like.

## `palette.json` holds every colour value

`src/shared/theme/lib/palette.json` holds every colour value in the app, and
`src/shared/theme/lib/palette.ts` exports it to the theme. `app.config.ts`, which Expo loads
on its own, reads the brand colour behind the icon and the splash from the same JSON. A new
colour is a line in `palette.json` and a role in `src/shared/theme/index.ts`.

## Lint refuses a colour literal anywhere else

`no-restricted-syntax` in `eslint.config.mjs` reports a hex or `rgb()` literal anywhere in
`apps/native`, and points at `palette.json`. `yarn lint` and CI fail on one.

## Every component has a `testID`

A test finds a component by its `testID`, so every component takes one and passes it to its
root view. `ScreenContainer` and `PrimaryButton` require it; every screen passes one to its
`ScreenContainer`, as `home-screen` and `settings-screen` are. A component that renders
another passes it a `testID` derived from its own: `PrimaryButton` gives its spinner
`` `${testID}-loading` ``.
