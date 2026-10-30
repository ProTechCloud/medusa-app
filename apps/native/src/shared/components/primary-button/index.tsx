import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii, spacing } from "@/shared/theme";

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
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			testID={testID}
			style={({ pressed }) => [
				styles.button,
				disabled ? styles.disabled : pressed && styles.pressed,
			]}
		>
			<Text style={styles.label}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		paddingVertical: spacing.sm + spacing.xs,
		paddingHorizontal: spacing.md,
		borderRadius: radii.md,
		backgroundColor: colors.primary,
	},
	pressed: { opacity: 0.8 },
	disabled: { opacity: 0.5 },
	label: { color: colors.onPrimary, fontSize: fontSizes.md, fontWeight: "600" },
});
