import { render, screen } from "@testing-library/react-native";
import TabsLayout from "@/app/(tabs)/_layout";
import HomeRoute from "@/app/(tabs)/index";
import SettingsRoute from "@/app/(tabs)/settings";

jest.mock("expo-router/js-tabs", () =>
	require("@/app/__mocks__/mock-expo-router"),
);
jest.mock("@/screens/home", () => require("@/app/__mocks__/mock-screens"));
jest.mock("@/screens/settings", () => require("@/app/__mocks__/mock-screens"));

describe("the tab bar", () => {
	it.each([
		{ testID: "tab-index", title: "navigation.tabs.home" },
		{ testID: "tab-settings", title: "navigation.tabs.settings" },
	])("registers the $title tab", ({ testID, title }) => {
		render(<TabsLayout />);

		expect(screen.getByTestId(testID)).toHaveTextContent(title);
	});

	it.each([
		{ label: "the home tab", Route: HomeRoute, testID: "home-screen" },
		{
			label: "the settings tab",
			Route: SettingsRoute,
			testID: "settings-screen",
		},
	])("$label shows its screen", ({ Route, testID }) => {
		render(<Route />);

		expect(screen.getByTestId(testID)).toBeOnTheScreen();
	});
});
