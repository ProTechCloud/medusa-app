import { faker } from "@faker-js/faker";
import {
	ChangePasswordDocument,
	MeDocument,
	RequestPasswordResetDocument,
	RequestSignUpCodeDocument,
	ResetPasswordDocument,
	SignInDocument,
	SignOutDocument,
	SignUpDocument,
} from "@medusa/gql/operations";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { graphqlRequest } from "@/testing/graphql-request";
import { integrationContextForEachTest } from "@/testing/integration-context";

describe("/graphql auth, on a local API", () => {
	integrationContextForEachTest({ environment: "local", trustedProxies: 1 });

	it("signs up with 111111, signs in, changes the password, signs out and resets it", async () => {
		const { email, name, password } = generateSignUp();
		const newPassword = faker.internet.password({ length: 16 });
		const resetPassword = faker.internet.password({ length: 16 });

		const requested = await graphqlRequest(RequestSignUpCodeDocument, {
			input: { email },
		});
		expect(requested.data?.requestSignUpCode.sent).toBe(true);

		const signedUp = await graphqlRequest(SignUpDocument, {
			input: { email, code: "111111", name, password },
		});
		expect(signedUp.data?.signUp.user).toMatchObject({
			email,
			name,
			role: "application_user",
		});

		const signedIn = await graphqlRequest(SignInDocument, {
			input: { email, password },
		});
		const token = String(signedIn.data?.signIn.token);
		const me = await graphqlRequest(MeDocument, {}, { token });
		expect(me.data?.me?.email).toBe(email);

		const changed = await graphqlRequest(
			ChangePasswordDocument,
			{ input: { currentPassword: password, newPassword } },
			{ token },
		);
		const newToken = String(changed.data?.changePassword.token);
		const afterChange = await graphqlRequest(MeDocument, {}, { token });
		expect(afterChange.data?.me).toBeNull();

		const signedOut = await graphqlRequest(
			SignOutDocument,
			{},
			{ token: newToken },
		);
		expect(signedOut.data?.signOut).toBe(true);
		const afterSignOut = await graphqlRequest(
			MeDocument,
			{},
			{ token: newToken },
		);
		expect(afterSignOut.data?.me).toBeNull();

		await graphqlRequest(RequestPasswordResetDocument, { input: { email } });
		const reset = await graphqlRequest(ResetPasswordDocument, {
			input: { email, code: "111111", newPassword: resetPassword },
		});
		expect(reset.data?.resetPassword).toBe(true);
		const withReset = await graphqlRequest(SignInDocument, {
			input: { email, password: resetPassword },
		});
		expect(withReset.data?.signIn.user.email).toBe(email);
	});

	it("answers a bad input with BAD_USER_INPUT and what is wrong", async () => {
		const result = await graphqlRequest(RequestSignUpCodeDocument, {
			input: { email: faker.lorem.word() },
		});

		expect(result.errors).toEqual([
			expect.objectContaining({
				message: "email: is not an email",
				extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }),
			}),
		]);
	});

	it.each([
		[
			"an email longer than any address",
			() => ({
				email: `${"a".repeat(250)}@x.io`,
				password: faker.internet.password(),
			}),
			"email: is too long",
		],
		[
			"a password longer than Better Auth takes",
			() => ({ email: faker.internet.email(), password: "a".repeat(129) }),
			"password: is too long",
		],
	])("refuses %s before it is hashed or stored", async (_, input, message) => {
		const result = await graphqlRequest(SignInDocument, { input: input() });

		expect(result.errors).toEqual([
			expect.objectContaining({
				message,
				extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }),
			}),
		]);
	});

	it("trims and lowercases an email, so a sign-up and a sign-in agree on it", async () => {
		const { email, name, password } = generateSignUp();
		const typed = `  ${email.toUpperCase()}  `;

		await graphqlRequest(RequestSignUpCodeDocument, {
			input: { email: typed },
		});
		const signedUp = await graphqlRequest(SignUpDocument, {
			input: { email: typed, code: "111111", name, password },
		});
		expect(signedUp.data?.signUp.user.email).toBe(email);

		const signedIn = await graphqlRequest(SignInDocument, {
			input: { email: typed, password },
		});
		expect(signedIn.data?.signIn.user.email).toBe(email);
	});

	it.each([
		[
			"a code that is not 6 digits",
			{ code: "12345" },
			"code: must be 6 digits",
		],
		["a blank name", { name: "   " }, "name: is required"],
		["a name too long", { name: "a".repeat(101) }, "name: is too long"],
	])("refuses a sign-up with %s", async (_, override, message) => {
		const result = await graphqlRequest(SignUpDocument, {
			input: { ...generateSignUp(), code: "111111", ...override },
		});

		expect(result.errors).toEqual([
			expect.objectContaining({
				message,
				extensions: expect.objectContaining({ code: "BAD_USER_INPUT" }),
			}),
		]);
	});

	it("answers a sign-out without a session with UNAUTHENTICATED", async () => {
		const result = await graphqlRequest(SignOutDocument, {});

		expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
	});

	it("answers the eleventh request for one address with TOO_MANY_REQUESTS and a retry time", async () => {
		const { email } = generateSignUp();
		for (let request = 1; request <= 10; request++) {
			await graphqlRequest(RequestSignUpCodeDocument, { input: { email } });
		}

		const result = await graphqlRequest(RequestSignUpCodeDocument, {
			input: { email },
		});

		expect(result.errors?.[0]?.extensions).toEqual(
			expect.objectContaining({
				code: "TOO_MANY_REQUESTS",
				retryAfterSeconds: expect.any(Number),
			}),
		);
	});
});
