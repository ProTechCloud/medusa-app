import { renderEmail, type TEmailType } from "#src/index.ts";
import { generateEmailEnvelope } from "#src/testing/index.ts";

describe("renderEmail", () => {
	it.each<[TEmailType, string]>([
		["signup.code_requested", "Your Medusa sign-up code"],
		["password.reset_requested", "Your Medusa password reset code"],
	])(
		"writes the %s email to its address, with the code",
		async (type, subject) => {
			const envelope = generateEmailEnvelope(type);

			const email = await renderEmail(envelope);

			expect(email.to).toBe(envelope.data.email);
			expect(email.subject).toBe(subject);
			expect(email.html).toContain(envelope.data.code);
		},
	);
});
