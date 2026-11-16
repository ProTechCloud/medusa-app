import { Code } from "../shared/components/code";
import { Heading } from "../shared/components/heading";
import { Layout } from "../shared/components/layout";
import { Paragraph } from "../shared/components/paragraph";

export function PasswordResetEmail({ code }: { code: string }) {
	return (
		<Layout preview={`Your Medusa password reset code is ${code}`}>
			<Heading>Reset your password</Heading>
			<Paragraph>Enter this code in Medusa to choose a new password.</Paragraph>
			<Code code={code} />
			<Paragraph variant="muted">
				It expires in 15 minutes. If you did not ask to reset your password, you
				can ignore this email: your password stays the same.
			</Paragraph>
		</Layout>
	);
}
