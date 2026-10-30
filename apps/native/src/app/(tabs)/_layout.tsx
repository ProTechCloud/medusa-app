import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/shared/theme";
import { Icon, type TIconName } from "@/shared/vector-icons";

/**
 * Every tab, in the order the bar shows them. `name` is the route file in
 * this folder; `titleKey` is in the `navigation` namespace. A new tab is a
 * route file and one line here.
 */
const TABS: ReadonlyArray<{ name: string; titleKey: string; icon: TIconName }> =
	[
		{ name: "index", titleKey: "tabs.home", icon: "home-outline" },
		{ name: "settings", titleKey: "tabs.settings", icon: "settings-outline" },
	];

export default function TabsLayout() {
	const { t } = useTranslation("navigation");
	const { colors } = useTheme();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
				},
			}}
		>
			{TABS.map((tab) => (
				<Tabs.Screen
					key={tab.name}
					name={tab.name}
					options={{
						title: t(tab.titleKey),
						tabBarButtonTestID: `tab-${tab.name}`,
						tabBarIcon: ({ color, size }) => (
							<Icon name={tab.icon} color={color} size={size} />
						),
					}}
				/>
			))}
		</Tabs>
	);
}
