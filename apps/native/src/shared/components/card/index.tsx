import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii, spacing } from "@/shared/theme";

type TCardProps = {
	title: string;
	children: ReactNode;
	testID?: string;
};

/** A titled card that groups related content, such as rows of `ListRow`. */
export function Card({ title, children, testID }: TCardProps) {
	return (
		<View style={styles.card} testID={testID}>
			<Text style={styles.title}>{title}</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
	},
	title: { color: colors.text, fontSize: fontSizes.lg, fontWeight: "600" },
});
