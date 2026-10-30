import { createElement, type ReactNode } from "react";
import { Text } from "react-native";

type TScreenProps = {
	name: string;
	options?: { title?: string; tabBarButtonTestID?: string };
};

/**
 * Stands in for `expo-router`'s navigators in the layout tests. Each
 * registered screen renders its title under its tab button's `testID`, so a
 * test reads which tabs a layout registered without a navigation container.
 * A test wires it with
 * `jest.mock("expo-router/js-tabs", () => require(<this file>))`, or the
 * same for `expo-router` when it needs `Stack`.
 */
function Navigator({ children }: { children?: ReactNode }) {
	return children;
}

function Screen({ name, options }: TScreenProps) {
	return createElement(
		Text,
		{ testID: options?.tabBarButtonTestID ?? `screen-${name}` },
		options?.title ?? name,
	);
}

export const Tabs = Object.assign(Navigator, { Screen });
export const Stack = Object.assign(Navigator, { Screen });
