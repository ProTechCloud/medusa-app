import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { colors, fontSizes, spacing } from "@/shared/theme";

type TScreenContainerProps = {
	title: string;
	children: ReactNode;
	testID: string;
	/** Inside the tab bar, which already keeps clear of the bottom edge. */
	insideTabs?: boolean;
};

// The sides too, so a notch or a rounded corner never covers content in
// landscape.
const TAB_EDGES: Edge[] = ["top", "left", "right"];
const FULL_EDGES: Edge[] = [...TAB_EDGES, "bottom"];

/** Every screen's frame: clear of the notch, scrollable, with its title. */
export function ScreenContainer({
	title,
	children,
	testID,
	insideTabs = false,
}: TScreenContainerProps) {
	return (
		<SafeAreaView
			edges={insideTabs ? TAB_EDGES : FULL_EDGES}
			style={styles.screen}
			testID={testID}
		>
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
