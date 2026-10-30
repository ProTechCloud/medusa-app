import { Pressable, Text } from "react-native";
import { useTheme } from "@/shared/theme";

type TPrimaryButtonProps = {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	testID?: string;
};

/** The main action on a screen. */
export function PrimaryButton({
	label,
	onPress,
	disabled = false,
	testID,
}: TPrimaryButtonProps) {
	const { colors, spacing, fontSize, radius } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			testID={testID}
			style={({ pressed }) => ({
				alignItems: "center",
				paddingVertical: spacing.sm + spacing.xs,
				paddingHorizontal: spacing.md,
				borderRadius: radius.md,
				backgroundColor: colors.primary,
				opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
			})}
		>
			<Text
				style={{
					color: colors.onPrimary,
					fontSize: fontSize.md,
					fontWeight: "600",
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}
