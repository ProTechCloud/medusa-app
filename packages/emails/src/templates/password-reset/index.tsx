import { Code } from "#src/shared/components/code/index.tsx";
import { Heading } from "#src/shared/components/heading/index.tsx";
import { Layout } from "#src/shared/components/layout/index.tsx";
import { Paragraph } from "#src/shared/components/paragraph/index.tsx";

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
