import { createElement } from "react";
import { Text } from "react-native";

/**
 * Stand-ins for the screens the routes render, so a route test checks which
 * screen a route shows without rendering that screen. A test wires them with
 * `jest.mock("@/screens/home", () => require(<this file>))`, and the same
 * for `@/screens/settings`.
 */
export function HomeScreen() {
	return createElement(Text, { testID: "home-screen" }, "home");
}

export function SettingsScreen() {
	return createElement(Text, { testID: "settings-screen" }, "settings");
}
