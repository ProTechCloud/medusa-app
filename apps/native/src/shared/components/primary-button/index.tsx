import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii, spacing } from "@/shared/theme";

type TPrimaryButtonVariant = "solid" | "outline" | "danger";

type TPrimaryButtonProps = {
	label: string;
	onPress: () => void;
	testID: string;
	variant?: TPrimaryButtonVariant;
	disabled?: boolean;
	/** Shows a spinner in place of the label and ignores presses. */
	loading?: boolean;
};

/** The main action on a screen. */
export function PrimaryButton({
	label,
	onPress,
	testID,
	variant = "solid",
	disabled = false,
	loading = false,
}: TPrimaryButtonProps) {
	const inactive = disabled || loading;
	const look = VARIANTS[variant];

	return (
		<Pressable
			accessibilityRole="button"
			// The label stays the button's name while the spinner replaces it.
			accessibilityLabel={label}
			accessibilityState={{ disabled: inactive, busy: loading }}
			disabled={inactive}
			onPress={onPress}
			testID={testID}
			style={({ pressed }) => [
				styles.button,
				look.button,
				inactive ? styles.inactive : pressed && styles.pressed,
			]}
		>
			{loading ? (
				<ActivityIndicator
					color={look.label.color}
					testID={`${testID}-loading`}
				/>
			) : (
				<Text style={[styles.label, look.label]}>{label}</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
		paddingVertical: spacing.sm + spacing.xs,
		paddingHorizontal: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
	},
	pressed: { opacity: 0.8 },
	inactive: { opacity: 0.5 },
	label: { fontSize: fontSizes.md, fontWeight: "600" },
});

const VARIANTS = {
	solid: StyleSheet.create({
		button: { backgroundColor: colors.primary, borderColor: colors.primary },
		label: { color: colors.onPrimary },
	}),
	outline: StyleSheet.create({
		button: { backgroundColor: colors.surface, borderColor: colors.primary },
		label: { color: colors.primary },
	}),
	danger: StyleSheet.create({
		button: { backgroundColor: colors.danger, borderColor: colors.danger },
		label: { color: colors.onPrimary },
	}),
} satisfies Record<
	TPrimaryButtonVariant,
	{ button: object; label: { color: string } }
>;
