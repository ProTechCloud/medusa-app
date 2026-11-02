# @medusa/native

The iOS and Android app: [Expo](https://expo.dev) SDK 57 with
[Expo Router](https://docs.expo.dev/router/introduction/). Two tabs: **Home** shows what
the stg API answers at `/version`; **Settings** shows the app's version, build and
environment. PostHog records screens, touches, session replays and errors. No sign-in, push
or store release yet.

## Running it on an iPhone

Needs a Mac with Xcode signed in to the team's Apple account, CocoaPods, and the phone in
Developer Mode, connected and trusted.

```bash
cp apps/native/.env.dev.example apps/native/.env.dev
yarn workspace @medusa/native ios --device   # build, sign, install and open Medusa Dev
yarn dev --native                            # later: the API and Metro; the phone reloads on save
```

`ios` runs `expo run:ios`, which first generates `ios/` from `app.config.ts` (prebuild),
then builds with Xcode. `ios/`, `android/` and `.expo/` are generated and gitignored: change
`app.config.ts`, never them. The first build takes several minutes; after it, `dev` is
enough until a native dependency or `app.config.ts` changes.

`expo run:ios` reuses an `ios/` that already exists, so switching builds needs a clean
prebuild first, or the new build keeps the old bundle ID and name:

```bash
cd apps/native
APP_ENV=stg npx expo prebuild --clean   # regenerate ios/ and android/ for stg
APP_ENV=stg npx expo run:ios --device
```

## Builds and their env files

`APP_ENV` picks the build, and `app.config.ts` reads `.env.<APP_ENV>`, with
`.env.<APP_ENV>.local` winning when it exists:

| `APP_ENV`       | App name     | Env file   |
| --------------- | ------------ | ---------- |
| `dev` (default) | `Medusa Dev` | `.env.dev` |
| `stg`           | `Medusa Stg` | `.env.stg` |
| `prd`           | `Medusa`     | `.env.prd` |

| Variable                 | Required | What                                                               |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `APP_BUNDLE_ID`          | yes      | the App ID in the Apple Developer account, and the Android package |
| `POSTHOG_PROJECT_TOKEN`  | no       | the PostHog project token; unset disables the SDK                  |
| `POSTHOG_HOST`           | no       | the PostHog ingestion host                                         |
| `POSTHOG_CLI_PROJECT_ID` | no       | the PostHog project the CLI uploads to; set with the API key       |
| `POSTHOG_CLI_API_KEY`    | no       | the personal key the CLI uploads with; set with the project ID     |

A missing or bad variable stops the build with its name. Only `.env.*.example` files are
committed. Inside the app, `src/config/app-config` parses what the build wrote into
`extra` once, at launch; nothing else reads `Constants` or `process.env`.

## PostHog

`src/shared/posthog` holds the client. It sends a `$screen` per route, touches, a session
replay with every text and image masked, uncaught errors and native crashes, and adds the
identity headers to the API calls, so a trace links to its replay. No user is identified yet.

The build uploads the Hermes source map and the dSYMs when both CLI keys are set and
`.env.dev.local` exists. The keys live in that file on your Mac only, never in `.env.dev`,
and no GitHub secret holds them. To upload from your own builds:

```bash
npm install -g @posthog/cli@0.19.0
cp apps/native/.env.dev.local.example apps/native/.env.dev.local
```

Use a personal key with `error_tracking:write` and `organization:read` only, and revoke it
when you stop building locally. Leave the keys unset to skip the upload.

## Layout

```
src/
├── app/            routes only: Expo Router turns each file into a screen
│   └── (tabs)/     the tab bar (expo-router/js-tabs), from the TABS table in its _layout.tsx
├── screens/        the screens the routes render, with their hooks
├── config/         the build's config, parsed once
├── i18n/           every string, one namespace per area, in resources/en/
├── shared/
│   ├── theme/      the tokens as constants: colors, spacing, fontSizes, radii, iconSizes;
│   │               lib/palette.json holds every colour value
│   ├── components/ ScreenContainer, PrimaryButton, Card, ListRow
│   ├── vector-icons/ the Icon wrapper
│   ├── splash-screen/ keepSplashScreenUntilReady and hideSplashScreen
│   ├── posthog/    the client and usePostHogScreens
│   └── zustand/    createAppStore and the store resets
└── testing/        Jest setup and the shared mocks
```

Components build their styles from those constants with `StyleSheet.create` at module
level. The app is light only (`userInterfaceStyle: "light"`). A colour value outside the
palette fails lint (`no-restricted-syntax` in `eslint.config.mjs`); screens use a role from
`@/shared/theme`. `app.config.ts` reads the brand colour from `palette.json` too.

## Tests

Jest on the `jest-expo` preset, with fake timers on. `src/testing/mocks.ts` runs before
every test: translations render as `namespace.key`, and `fetch` is `mockFetch` from
`src/testing/mock-fetch.ts`, which rejects any path a test did not answer.

```bash
yarn workspace @medusa/native test
```
