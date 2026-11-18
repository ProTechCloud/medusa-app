import type { ReactNode } from "react";
import { Text } from "react-email";
import { colors, spacing, typography } from "#src/shared/tokens.ts";

const baseStyle = {
	color: colors.text,
	fontSize: typography.fontSizes.md,
	lineHeight: typography.lineHeights.relaxed,
	margin: `0 0 ${spacing.md} 0`,
};

const variants = {
	default: {},
	muted: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
};

type Props = {
	variant?: keyof typeof variants;
	children: ReactNode;
};

export function Paragraph({ variant = "default", children }: Props) {
	return <Text style={{ ...baseStyle, ...variants[variant] }}>{children}</Text>;
}
