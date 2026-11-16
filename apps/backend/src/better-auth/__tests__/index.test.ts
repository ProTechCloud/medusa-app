import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/better-auth/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";

function bearer(token: string): Headers {
	return new Headers({ authorization: `Bearer ${token}` });
}

describe("createAuth", () => {
	const { ctx } = integrationContextForEachTest();

	it("gives every new user the application_user role, whatever the sign-up sends", async () => {
		const { auth } = ctx();

		const { user } = await auth.api.signUpEmail({
			body: { ...generateSignUp(), role: "admin" } as never,
		});

		expect(user.role).toBe("application_user");
	});

	it("opens a session from the sign-up's token sent as a bearer header", async () => {
		const { auth, sessionCache } = ctx();
		const signUp = generateSignUp();

		const { token } = await auth.api.signUpEmail({ body: signUp });
		const session = await sessionCache.get(bearer(String(token)));

		expect(session?.user.email).toBe(signUp.email);
	});

	it("forgets a session as soon as it signs out", async () => {
		const { auth, sessionCache } = ctx();
		const { token } = await auth.api.signUpEmail({ body: generateSignUp() });
		const headers = bearer(String(token));
		await sessionCache.get(headers);

		await auth.api.signOut({ headers });

		await expect(sessionCache.get(headers)).resolves.toBeNull();
	});
});
