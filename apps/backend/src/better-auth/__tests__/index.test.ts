import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { requestHeaders } from "@/testing/test-user";

describe("createAuth", () => {
	const { ctx } = integrationContextForEachTest();

	it("gives every new user the application_user role, whatever the sign-up sends", async () => {
		const { auth } = ctx();

		// Built apart from the call, so TypeScript takes the field its sign-up
		// type leaves out, as a client's request body would carry it.
		const body = { ...generateSignUp(), role: "admin" };

		const { user } = await auth.api.signUpEmail({ body });

		expect(user.role).toBe("application_user");
	});

	it("opens a session from the sign-up's token sent as a bearer header", async () => {
		const { auth, sessionCache } = ctx();
		const signUp = generateSignUp();

		const { token } = await auth.api.signUpEmail({ body: signUp });
		const session = await sessionCache.get(requestHeaders(String(token)));

		expect(session?.user.email).toBe(signUp.email);
	});

	it("forgets a session as soon as it signs out", async () => {
		const { auth, sessionCache } = ctx();
		const { token } = await auth.api.signUpEmail({ body: generateSignUp() });
		const headers = requestHeaders(String(token));
		await sessionCache.get(headers);

		await auth.api.signOut({ headers });

		await expect(sessionCache.get(headers)).resolves.toBeNull();
	});
});
