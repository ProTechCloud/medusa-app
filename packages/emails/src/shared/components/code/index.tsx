import { Text } from "react-email";
import { colors, spacing, typography } from "../../tokens";

const style = {
	backgroundColor: colors.background,
	border: `1px solid ${colors.border}`,
	borderRadius: "8px",
	color: colors.brand,
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
	fontSize: typography.fontSizes.code,
	fontWeight: "700",
	letterSpacing: "8px",
	margin: `0 0 ${spacing.lg} 0`,
	padding: spacing.md,
	textAlign: "center" as const,
};

/** A one-time code, large and spaced so it reads and copies easily. */
export function Code({ code }: { code: string }) {
	return <Text style={style}>{code}</Text>;
}
