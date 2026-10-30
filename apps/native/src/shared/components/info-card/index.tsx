import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

type TInfoCardProps = {
	title: string;
	children: ReactNode;
};

/** A titled card that groups related facts, such as rows of `InfoRow`. */
export function InfoCard({ title, children }: TInfoCardProps) {
	const { colors, spacing, fontSize, radius } = useTheme();

	return (
		<View
			style={{
				gap: spacing.sm,
				padding: spacing.md,
				borderRadius: radius.md,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: colors.surface,
			}}
		>
			<Text
				style={{
					color: colors.text,
					fontSize: fontSize.lg,
					fontWeight: "600",
				}}
			>
				{title}
			</Text>
			{children}
		</View>
	);
}
