# Expo Style Guide

Rules for the native app in `apps/native` (Expo SDK 57 with Expo Router). For the rules every
app follows, see the [Style Guide](../../style-guide/index.md).

## Documents

| Guide                                       | What it covers                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Project Structure](./project-structure.md) | the files Expo owns, route files that render a screen, where screens and shared pieces live |
| [Components](./components.md)               | a folder per component, the shared components, theme roles, the palette, `testID`           |
| [Hooks](./hooks.md)                         | a folder per hook, colocated or shared, small wrappers over platform APIs                   |
| [Context](./context.md)                     | a folder per context, colocated or shared, providers wired in the root layout               |
| [State](./state.md)                         | Zustand stores through `createAppStore`, `member` and `device` scopes, no `useState`        |
| [Testing](./testing.md)                     | Jest on `jest-expo`, fake timers, `userEvent`, `mockFetch`, the helpers, the mistakes       |
| [Testing Patterns](./testing-patterns.md)   | each testing rule in a test from the app                                                    |

## See also

- [Style Guide](../../style-guide/index.md) — placement, imports, packages and how tests are
  written, for every app and package.
- [i18n](../../style-guide/i18n.md) — one JSON file per domain, tests assert on keys.
- [TypeScript Conventions](../../typescript/conventions.md) — type prefixes, no single-letter
  names, dates with Luxon.
- [Monorepo](../../monorepo.md) — the route-file exception to the placement rule.
