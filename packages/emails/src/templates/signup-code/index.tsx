import { Code } from "#src/shared/components/code/index.tsx";
import { Heading } from "#src/shared/components/heading/index.tsx";
import { Layout } from "#src/shared/components/layout/index.tsx";
import { Paragraph } from "#src/shared/components/paragraph/index.tsx";

export function SignUpCodeEmail({ code }: { code: string }) {
	return (
		<Layout preview={`Your Medusa code is ${code}`}>
			<Heading>Confirm your email</Heading>
			<Paragraph>
				Enter this code in Medusa to finish creating your account.
			</Paragraph>
			<Code code={code} />
			<Paragraph variant="muted">
				It expires in 15 minutes. If you did not try to sign up, you can ignore
				this email.
			</Paragraph>
		</Layout>
	);
}
