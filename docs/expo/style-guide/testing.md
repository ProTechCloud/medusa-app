# Testing

How the native app in `apps/native` is tested. Where tests, mocks and factories live, and
what every test asserts, are in [Test Organization](../../style-guide/test-organization.md)
and [Test Quality](../../style-guide/test-quality.md); [Testing Patterns](./testing-patterns.md)
shows each rule below in a test from the app.

Paths below are under `apps/native/`.

## Jest, on the `jest-expo` preset

`jest.config.js` runs Jest on the `jest-expo` preset, the runner Expo and React Native
support; every other workspace runs vitest. `yarn workspace @medusa/native test` runs it,
and `yarn test` from the root runs it with the rest.

## React Native Testing Library

Screens and components are tested with `@testing-library/react-native`: `render`,
`renderHook`, `screen`, `within`, `act` and `userEvent` come from it.

## Fake timers, advanced once by the whole duration

`jest.config.js` turns fake timers on for every test, so nothing waits on a real clock. A
test that waits for something advances the clock once, by the whole duration it waits,
with `await act(() => jest.advanceTimersByTimeAsync(ms))`. Promises that resolve without a
delay settle with `jest.advanceTimersByTimeAsync(0)`.

## Press by `testID`, paste to fill a field, type only when keystrokes matter

A test finds what it presses by its `testID` and presses it with `userEvent.press`. It fills
a field with `userEvent.paste`, and uses `userEvent.type` only when each keystroke matters,
such as a field that formats as it is typed.

## Full render, never shallow

A test renders the real screen or component with everything it renders inside, never a
shallow copy. Only the edges are mocked: the network, the platform modules, the router.

## Assert visible behaviour, never styles

A test asserts what the user sees and can do: a `testID` on screen, a text, a press that
runs or is ignored, where the app navigates. It never asserts a style, a colour or a
layout value, which change without the behaviour changing.

## Wrap platform APIs and mock the wrapper

A platform API is reached through a small wrapper of the app's own, and a test mocks that
wrapper from a file in `__mocks__/`, never the platform module inline. The mock is wired
with `jest.mock("<module>", () => require("<mock file>"))`.

## The network answers through `mockFetch`

`src/testing/mocks.ts` installs `mockFetch` from `src/testing/mock-fetch.ts` as the global
`fetch` and resets it before each test. A test says what a path answers with
`mockFetch.on(path, answer)`, reads how many requests reached it with `mockFetch.calls(path)`,
and how many were cancelled with `mockFetch.cancelled(path)`. A path no test set rejects, so
a forgotten answer fails the test.

## The helpers

| Helper                                         | What it gives a test                                                                                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/testing/mocks.ts`                         | loaded before every test file: react-i18next, expo-router, expo-constants, expo-localization, safe area; `resetAllStores()` and `mockFetch.reset()` before each test |
| `src/testing/mock-fetch.ts`                    | `mockFetch`: `on`, `calls`, `cancelled`                                                                                                                              |
| `src/testing/mock-expo-router-with-replace.ts` | the router a screen test reads and steers: `mockReplace`, `mockPush`, `mockBack`, `mockPathname`, `mockSearchParams`, `mockBlur`, `mockFocus`                        |
| `src/app/__mocks__/mock-screens.ts`            | stand-ins for the screens, so a route test checks which screen a route shows without rendering it                                                                    |
| `src/app/__mocks__/mock-expo-router.ts`        | `Tabs` and `Stack` that render each registered screen's title, for the layout tests                                                                                  |
| `generate-*.ts` in `__mocks__/`                | faker factories, such as `src/screens/home/__mocks__/generate-version.ts`; a test overrides only the fields it cares about                                           |

## Mistakes

| Mistake                                                      | Instead                                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| a polling `waitFor`, or a `findBy` that waits for the screen | advance the fake clock by the whole duration, or settle with `advanceTimersByTimeAsync(0)`, then `getBy` |
| the same inline `jest.mock` body repeated in test files      | one mock file in `__mocks__/`, wired with `jest.mock("<module>", () => require(...))`                    |
| hardcoded fixtures, such as `commit: "abc1234"`              | a `generate-*.ts` factory with faker                                                                     |
| a custom timeout on a test, such as `}, 15_000);`            | none: a test that needs one is waiting on a real clock                                                   |
| rendering the real screens in a route test                   | the stand-ins in `src/app/__mocks__/mock-screens.ts`                                                     |
