# Testing Patterns

Each rule in [Testing](./testing.md), in a test from `apps/native`. The patterns every
workspace shares are in the [shared Testing Patterns](../../style-guide/testing-patterns.md).

Paths below are under `apps/native/`.

## Press by `testID`

From `src/shared/components/primary-button/__tests__/index.test.tsx`:

```tsx
it.each(["solid", "outline", "danger"] as const)(
	"a %s button runs its action when pressed",
	async (variant) => {
		const onPress = createPressHandler();
		const label = faker.lorem.words(2);
		await render(
			<PrimaryButton
				label={label}
				onPress={onPress}
				testID="button"
				variant={variant}
			/>,
		);

		await userEvent.press(screen.getByTestId("button"));

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.getByText(label)).toBeOnTheScreen();
	},
);
```

- `userEvent.press` on the `testID`, as a user presses, not `fireEvent`.
- The handler comes from
  `src/shared/components/primary-button/__mocks__/mock-press-handler.ts`, the label from
  faker.
- It asserts what happened and what shows, never a style.

## Advance the clock once, by the whole duration

From `src/screens/home/hooks/use-api-version/__tests__/index.test.ts`:

```ts
it("never lets an earlier answer that arrives late overwrite a newer one", async () => {
	mockFetch.on("/version", { body: generateVersion(), delayMs: 3000 });
	const { result } = await renderHook(() => useApiVersion());
	const newer = generateVersion();
	mockFetch.on("/version", { body: newer, delayMs: 1000 });

	await act(async () => result.current.check());
	await act(() => jest.advanceTimersByTimeAsync(3000));

	expect(mockFetch.calls("/version")).toBe(2);
	expect(result.current.status).toBe("ok");
	expect(result.current.version).toEqual(newer);
});
```

- `delayMs` holds each answer back on the fake clock; one advance of 3 s lets both arrive,
  the newer first.
- No `waitFor`: after the advance, the assertions are synchronous.
- `renderHook` tests the hook alone, because the case cannot be reached from the screen: its
  button only shows after a failure.

## The network through `mockFetch`

From `src/screens/home/__tests__/home-screen.test.tsx`:

```tsx
it("cancels the request in flight when the screen loses focus, without showing a failure", async () => {
	mockFetch.on("/version", { body: generateVersion(), delayMs: 5000 });
	await render(<HomeScreen />);

	await act(async () => mockBlur());

	expect(mockFetch.cancelled("/version")).toBe(1);
	expect(screen.queryByTestId("home-api-failed")).not.toBeOnTheScreen();
	expect(screen.getByTestId("home-api-checking")).toBeOnTheScreen();
});
```

- `mockFetch.on` sets what `/version` answers; `mockFetch.cancelled` counts the request the
  blur cancelled.
- `mockBlur` from `src/testing/mock-expo-router-with-replace.ts` takes the focus away, as
  leaving the tab does; `mockFocus` gives it back.

## A platform module, mocked from a file

From `src/screens/settings/__tests__/settings-screen.test.tsx`:

```tsx
jest.mock(
	"expo-application",
	() =>
		require("@/screens/settings/__mocks__/mock-expo-application")
			.expoApplication,
);

it("shows the app's version, build and environment", async () => {
	const version = faker.system.semver();
	const buildNumber = String(faker.number.int({ min: 1, max: 999 }));
	setBuild({
		nativeApplicationVersion: version,
		nativeBuildVersion: buildNumber,
	});

	await render(<SettingsScreen />);

	expect(
		within(screen.getByTestId("settings-version")).getByText(version),
	).toBeOnTheScreen();
	// …the build and the environment the same way
});
```

- The mock lives in `src/screens/settings/__mocks__/mock-expo-application.ts`; the test sets
  what the build reports with `setBuild`.
- `within` scopes each value to its row's `testID`.

## A route test renders stand-ins, not screens

From `src/app/__tests__/layout.test.tsx`:

```tsx
jest.mock("expo-router/js-tabs", () =>
	require("@/app/__mocks__/mock-expo-router"),
);
jest.mock("@/screens/home", () => require("@/app/__mocks__/mock-screens"));
jest.mock("@/screens/settings", () => require("@/app/__mocks__/mock-screens"));

it.each([
	{ label: "the home tab", Route: HomeRoute, testID: "home-screen" },
	{
		label: "the settings tab",
		Route: SettingsRoute,
		testID: "settings-screen",
	},
])("$label shows its screen", async ({ Route, testID }) => {
	await render(<Route />);

	expect(screen.getByTestId(testID)).toBeOnTheScreen();
});
```

- `mock-screens.ts` renders each screen's `testID` alone, so the route test checks which
  screen a route shows without rendering that screen.
- `mock-expo-router.ts` renders each tab's title under its `tabBarButtonTestID`, so the same
  file checks which tabs the layout registers.
- Cases that differ only in input are one `it.each` table.
