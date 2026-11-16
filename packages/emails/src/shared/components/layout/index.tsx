import type { ReactNode } from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "react-email";
import { colors, spacing, typography } from "../../tokens";

const body = {
	backgroundColor: colors.background,
	fontFamily: typography.fontFamily,
	margin: 0,
	padding: `${spacing.xl} ${spacing.md}`,
};

const container = {
	backgroundColor: colors.surface,
	margin: "0 auto",
	maxWidth: "560px",
	padding: spacing.xl,
	borderRadius: "12px",
	border: `1px solid ${colors.border}`,
};

const footer = {
	marginTop: spacing.lg,
	paddingTop: spacing.md,
	borderTop: `1px solid ${colors.border}`,
};

const footerText = {
	color: colors.textMuted,
	fontSize: typography.fontSizes.sm,
	margin: 0,
};

type Props = {
	/** The line a mail client shows beside the subject. */
	preview: string;
	children: ReactNode;
};

// Transactional emails only, so the footer carries no unsubscribe link.
export function Layout({ preview, children }: Props) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body style={body}>
				<Container style={container}>
					{children}
					<Section style={footer}>
						<Text style={footerText}>
							Medusa · You are receiving this because this address was used on
							Medusa.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
