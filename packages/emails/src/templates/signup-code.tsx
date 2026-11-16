import { Code } from "../shared/components/code";
import { Heading } from "../shared/components/heading";
import { Layout } from "../shared/components/layout";
import { Paragraph } from "../shared/components/paragraph";

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
