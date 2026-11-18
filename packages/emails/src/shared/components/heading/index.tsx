import type { ReactNode } from "react";
import { Heading as EmailHeading } from "react-email";
import { colors, spacing, typography } from "#src/shared/tokens.ts";

const style = {
	color: colors.text,
	fontSize: typography.fontSizes.xl,
	fontWeight: "700",
	lineHeight: typography.lineHeights.tight,
	margin: `0 0 ${spacing.md} 0`,
};

export function Heading({ children }: { children: ReactNode }) {
	return (
		<EmailHeading as="h1" style={style}>
			{children}
		</EmailHeading>
	);
}
