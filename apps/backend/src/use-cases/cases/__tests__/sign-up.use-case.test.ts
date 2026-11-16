import { faker } from "@faker-js/faker";
import { verification } from "@medusa/db";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { lastCode, requestHeaders } from "@/testing/test-user";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { signUpUseCase } from "@/use-cases/cases/sign-up.use-case";

const REFUSED = "The code is wrong or has expired.";

/** A code that is not `code`. */
function wrongCode(code: string): string {
	return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

describe("signUpUseCase", () => {
	const { ctx, bus } = integrationContextForEachTest();

	async function requestCode() {
		const details = generateSignUp();
		await requestSignUpCodeUseCase({
			email: details.email,
			headers: requestHeaders(),
		});
		const code = lastCode(bus(), "signup.code_requested", details.email);
		return { ...details, code, headers: requestHeaders() };
	}

	it("creates the account with its address verified, and signs it in", async () => {
		const request = await requestCode();

		const { user, token } = await signUpUseCase(request);

		const session = await ctx().sessionCache.get(requestHeaders(token));
		expect(user).toEqual({
			id: expect.any(String),
			name: request.name,
			email: request.email,
			role: "application_user",
		});
		expect(session?.user).toMatchObject({ id: user.id, emailVerified: true });
	});

	it("does not take the same code twice", async () => {
		const request = await requestCode();
		await signUpUseCase(request);

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("keeps the code when the sign-up fails, so it can be retried", async () => {
		const request = await requestCode();
		await expect(
			signUpUseCase({ ...request, password: faker.string.alpha(4) }),
		).rejects.toThrow("at least 8 characters");

		await expect(signUpUseCase(request)).resolves.toMatchObject({
			user: { email: request.email },
		});
	});

	it("still takes the right code after four wrong ones", async () => {
		const request = await requestCode();
		for (let attempt = 1; attempt <= 4; attempt++) {
			await expect(
				signUpUseCase({ ...request, code: wrongCode(request.code) }),
			).rejects.toThrow(REFUSED);
		}

		await expect(signUpUseCase(request)).resolves.toMatchObject({
			user: { email: request.email },
		});
	});

	it("deletes the code at the fifth wrong one", async () => {
		const request = await requestCode();
		for (let attempt = 1; attempt <= 5; attempt++) {
			await expect(
				signUpUseCase({ ...request, code: wrongCode(request.code) }),
			).rejects.toThrow(REFUSED);
		}

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("refuses a code after its 15 minutes", async () => {
		const request = await requestCode();
		await ctx()
			.db.update(verification)
			.set({ expiresAt: new Date(Date.now() - 1000) });

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("refuses an address that never asked for a code", async () => {
		const { code, ...request } = await requestCode();

		await expect(
			signUpUseCase({ ...request, email: generateSignUp().email, code }),
		).rejects.toThrow(REFUSED);
	});

	it("refuses 111111 while a Mailgun key is set", async () => {
		const request = await requestCode();

		await expect(signUpUseCase({ ...request, code: "111111" })).rejects.toThrow(
			REFUSED,
		);
	});
});

describe("signUpUseCase without a Mailgun key", () => {
	const { bus } = integrationContextForEachTest({ mailgun: {} });

	it("takes 111111 beside the emailed code", async () => {
		const details = generateSignUp();
		await requestSignUpCodeUseCase({
			email: details.email,
			headers: requestHeaders(),
		});
		expect(bus().published).toHaveLength(1);

		await expect(
			signUpUseCase({ ...details, code: "111111", headers: requestHeaders() }),
		).resolves.toMatchObject({ user: { email: details.email } });
	});
});
