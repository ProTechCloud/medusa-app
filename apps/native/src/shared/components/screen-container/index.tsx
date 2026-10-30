import type { ReactNode } from "react";
import { ScrollView, Text } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/shared/theme";

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
	const { colors, spacing, fontSize } = useTheme();
	const edges: Edge[] = insideTabs ? ["top"] : ["top", "bottom"];

	return (
		<SafeAreaView
			edges={edges}
			style={{ flex: 1, backgroundColor: colors.background }}
			testID={testID}
		>
			<ScrollView
				contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
			>
				<Text
					accessibilityRole="header"
					style={{
						color: colors.text,
						fontSize: fontSize.xl,
						fontWeight: "700",
					}}
				>
					{title}
				</Text>
				{children}
			</ScrollView>
		</SafeAreaView>
	);
}
