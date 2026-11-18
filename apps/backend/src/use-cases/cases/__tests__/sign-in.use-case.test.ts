import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { DOMAIN_ERROR_NAMES } from "@/shared/domain-errors";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { requestHeaders, signUpTestUser } from "@/testing/test-user";
import { loadMeUseCase } from "@/use-cases/cases/load-me.use-case";
import { signInUseCase } from "@/use-cases/cases/sign-in.use-case";
import { signOutUseCase } from "@/use-cases/cases/sign-out.use-case";

describe("signInUseCase", () => {
	const { bus } = integrationContextForEachTest();

	it("opens a session for the right password", async () => {
		const user = await signUpTestUser(bus());

		const { token } = await signInUseCase({
			email: user.email,
			password: user.password,
			headers: requestHeaders(),
		});

		await expect(
			loadMeUseCase({ headers: requestHeaders(token) }),
		).resolves.toMatchObject({ email: user.email });
	});

	it.each([
		["a wrong password", "known"],
		["an address with no account", "unknown"],
	])("answers %s the same way", async (_, which) => {
		const user = await signUpTestUser(bus());
		const email = which === "known" ? user.email : generateSignUp().email;

		await expect(
			signInUseCase({
				email,
				password: faker.internet.password({ length: 16 }),
				headers: requestHeaders(),
			}),
		).rejects.toThrow("Wrong email or password.");
	});
});

describe("signOutUseCase and loadMeUseCase", () => {
	const { bus } = integrationContextForEachTest();

	it("refuses the eleventh sign-in for one address with TOO_MANY_REQUESTS", async () => {
		const { email } = generateSignUp();
		const signIn = () =>
			signInUseCase({
				email,
				password: faker.internet.password({ length: 16 }),
				headers: requestHeaders(),
			});
		for (let attempt = 1; attempt <= 10; attempt++) {
			await expect(signIn()).rejects.toThrow("Wrong email or password.");
		}

		await expect(signIn()).rejects.toMatchObject({
			name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		});
	});

	it("loads the signed-in user, and nothing once it signs out", async () => {
		const { token, email } = await signUpTestUser(bus());
		const headers = requestHeaders(token);
		await expect(loadMeUseCase({ headers })).resolves.toMatchObject({ email });

		await signOutUseCase({ headers });

		await expect(loadMeUseCase({ headers })).resolves.toBeNull();
	});

	it.each([
		["no token", requestHeaders()],
		[
			"a token that opens no session",
			requestHeaders(faker.string.alphanumeric(32)),
		],
	])("refuses to sign out with %s", async (_, headers) => {
		await expect(signOutUseCase({ headers })).rejects.toThrow("Sign in first.");
	});
});
