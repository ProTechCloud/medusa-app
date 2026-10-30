import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii, spacing } from "@/shared/theme";

type TInfoCardProps = {
	title: string;
	children: ReactNode;
};

/** A titled card that groups related facts, such as rows of `InfoRow`. */
export function InfoCard({ title, children }: TInfoCardProps) {
	return (
		<View style={styles.card}>
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
