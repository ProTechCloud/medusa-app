import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing } from "@/shared/theme";

type TScreenContainerProps = {
	title: string;
	children: ReactNode;
	/** Inside the tab bar, which already keeps clear of the bottom edge. */
	insideTabs?: boolean;
	testID?: string;
};

/** Every screen's frame: clear of the notch, scrollable, with its title. */
export function ScreenContainer({
	title,
	children,
	insideTabs = false,
	testID,
}: TScreenContainerProps) {
	const edges: Edge[] = insideTabs ? ["top"] : ["top", "bottom"];

	return (
		<SafeAreaView edges={edges} style={styles.screen} testID={testID}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text accessibilityRole="header" style={styles.title}>
					{title}
				</Text>
				{children}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: spacing.md, gap: spacing.md },
	title: { color: colors.text, fontSize: fontSizes.xl, fontWeight: "700" },
});
