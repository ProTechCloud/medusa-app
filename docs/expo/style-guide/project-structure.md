# Project Structure

Where each part of the native app in `apps/native` lives: the files Expo owns, the routes,
the screens and what they share. The [placement rule](../../style-guide/placement-rule.md)
governs everything else under `src/`.

Paths below are under `apps/native/`.

## Framework-owned entry points stay bare

Expo and Expo Router load these files by name and expect their shape:

- `expo-router/entry`, the `main` in `package.json`, which starts the router
- `src/app/_layout.tsx`, the root layout
- `src/app/(tabs)/_layout.tsx`, the tab bar
- the route files in `src/app/(tabs)/`: `index.tsx` and `settings.tsx`

They are the one exception to the placement rule's module shape, as
[`docs/monorepo.md`](../../monorepo.md#route-files-in-the-native-app) records: a folder in
`src/app/` holds route files side by side, named by the framework. They are entry points,
never a place for logic or UI of their own.

## A route file renders its screen and nothing else

`src/app/(tabs)/index.tsx` renders `HomeScreen`, and `src/app/(tabs)/settings.tsx` renders
`SettingsScreen`:

```tsx
import { HomeScreen } from "@/screens/home";

/** The route only; the screen lives in `@/screens/home`. */
export default function IndexRoute() {
	return <HomeScreen />;
}
```

No hooks, no state, no styles and no tests in a route file. The screen holds them.

## `ios/` and `android/` are generated, never committed

`expo prebuild`, which `expo run:ios` and `expo run:android` run, writes both folders from
`app.config.ts`. They are in `.gitignore`, and ESLint, Biome, Jest and fallow ignore
them. A change to the native projects is a change to `app.config.ts` or a config plugin,
followed by `npx expo prebuild --clean`; an edit inside `ios/` or `android/` is lost on the
next prebuild.

## Screens live in `src/screens/<screen>/index.tsx`

One folder per screen, named in kebab-case: `src/screens/home/index.tsx` exports
`HomeScreen`, `src/screens/settings/index.tsx` exports `SettingsScreen`. The screen's tests
are in its `__tests__/`, its mocks and factories in its `__mocks__/`.

## Screen-local pieces live under that screen

A component or hook only one screen uses lives in that screen's `components/` or `hooks/`,
each a folder with its own `index.ts` or `index.tsx`. `src/screens/home/hooks/use-api-version/`
is the hook only Home uses; its helper, the zod schema, is in
`src/screens/home/hooks/use-api-version/lib/version-schema.ts`.

## Cross-screen pieces live in `src/shared/`

Once a second screen needs a piece, it moves to `src/shared/`: the components in
`src/shared/components/`, the theme in `src/shared/theme/`, the store factory in
`src/shared/zustand/`, the splash hold in `src/shared/splash-screen/` and the icons in
`src/shared/vector-icons/`.

## The tree

`src/` as it is, without `__tests__/` and `__mocks__/`:

```text
src/
├── app/                          routes only: Expo Router turns each file into a screen
│   ├── _layout.tsx               the root layout: i18n, the status bar, the splash hold
│   └── (tabs)/
│       ├── _layout.tsx           the tab bar, from its TABS table
│       ├── index.tsx             renders HomeScreen
│       └── settings.tsx          renders SettingsScreen
├── config/
│   └── app-config/index.ts       the build's extra, parsed once at launch
├── i18n/
│   ├── index.ts                  i18next with expo-localization
│   └── resources/en/             home.json, navigation.json, settings.json
├── screens/
│   ├── home/
│   │   ├── index.tsx             HomeScreen
│   │   └── hooks/
│   │       └── use-api-version/  what the stg API answers at /version
│   │           ├── index.ts
│   │           └── lib/version-schema.ts
│   └── settings/
│       └── index.tsx             SettingsScreen
├── shared/
│   ├── components/               card, list-row, primary-button, screen-container
│   ├── splash-screen/index.ts    keepSplashScreenUntilReady, hideSplashScreen
│   ├── theme/
│   │   ├── index.ts              colours, spacing, font sizes, radii, icon sizes
│   │   └── lib/                  palette.json, palette.ts
│   ├── vector-icons/index.tsx    Icon
│   └── zustand/index.ts          createAppStore, resetMemberStores, resetAllStores
└── testing/                      mocks.ts, mock-fetch.ts, mock-expo-router-with-replace.ts
```

## Routes and the screen each renders

| Route       | File                          | Screen           |
| ----------- | ----------------------------- | ---------------- |
| `/`         | `src/app/(tabs)/index.tsx`    | `HomeScreen`     |
| `/settings` | `src/app/(tabs)/settings.tsx` | `SettingsScreen` |

`(tabs)` is a group: it adds the tab bar and nothing to the path. A new tab is a route file in
`src/app/(tabs)/`, its screen in `src/screens/`, and one line in the `TABS` table of
`src/app/(tabs)/_layout.tsx`.

## `_layout.tsx` wires what the whole app needs

`src/app/_layout.tsx` imports `@/i18n`, so every screen can translate; renders the status bar;
and holds the splash with `keepSplashScreenUntilReady()` from `src/shared/splash-screen`
until the first screen renders, then calls `hideSplashScreen()`. The app has no provider
yet. One that arrives later is defined under `src/shared/`, by the placement rule, and wired
in `src/app/_layout.tsx` around the `Stack`.
