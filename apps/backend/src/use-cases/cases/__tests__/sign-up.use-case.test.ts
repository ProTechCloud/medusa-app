import { faker } from "@faker-js/faker";
import { verification } from "@medusa/db";
import type { IMemoryBus } from "@medusa/events";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { DOMAIN_ERROR_NAMES } from "@/shared/domain-errors";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { lastCode, requestHeaders } from "@/testing/test-user";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { signUpUseCase } from "@/use-cases/cases/sign-up.use-case";

const REFUSED = "The code is wrong or has expired.";

/** A code that is not `code`. */
function wrongCode(code: string): string {
	return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

/** Asks for a code for a new address, and reads it off the bus. */
async function requestCode(bus: IMemoryBus) {
	const details = generateSignUp();
	await requestSignUpCodeUseCase({
		email: details.email,
		headers: requestHeaders(),
	});
	const code = lastCode(bus, "signup.code_requested", details.email);
	return { ...details, code, headers: requestHeaders() };
}

describe("signUpUseCase", () => {
	const { ctx, bus } = integrationContextForEachTest();

	it("creates the account with its address verified, and signs it in", async () => {
		const request = await requestCode(bus());

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
		const request = await requestCode(bus());
		await signUpUseCase(request);

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("keeps the code when the sign-up fails, so it can be retried", async () => {
		const request = await requestCode(bus());
		await expect(
			signUpUseCase({ ...request, password: faker.string.alpha(4) }),
		).rejects.toThrow("at least 8 characters");

		await expect(signUpUseCase(request)).resolves.toMatchObject({
			user: { email: request.email },
		});
	});

	it("still takes the right code after four wrong ones", async () => {
		const request = await requestCode(bus());
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
		const request = await requestCode(bus());
		for (let attempt = 1; attempt <= 5; attempt++) {
			await expect(
				signUpUseCase({ ...request, code: wrongCode(request.code) }),
			).rejects.toThrow(REFUSED);
		}

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("counts each of five wrong guesses sent at once, and deletes the code", async () => {
		const request = await requestCode(bus());

		await Promise.allSettled(
			[1, 2, 3, 4, 5].map(() =>
				signUpUseCase({ ...request, code: wrongCode(request.code) }),
			),
		);

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("refuses the eleventh guess for one address with TOO_MANY_REQUESTS", async () => {
		const request = await requestCode(bus());
		// The code request was the first of the address's ten.
		for (let attempt = 1; attempt <= 9; attempt++) {
			await expect(
				signUpUseCase({ ...request, code: wrongCode(request.code) }),
			).rejects.toThrow(REFUSED);
		}

		await expect(signUpUseCase(request)).rejects.toMatchObject({
			name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		});
	});

	it("refuses a code after its 15 minutes", async () => {
		const request = await requestCode(bus());
		await ctx()
			.db.update(verification)
			// The column takes a Date.
			.set({ expiresAt: DateTime.utc().minus({ seconds: 1 }).toJSDate() });

		await expect(signUpUseCase(request)).rejects.toThrow(REFUSED);
	});

	it("refuses an address that never asked for a code", async () => {
		const { code, ...request } = await requestCode(bus());

		await expect(
			signUpUseCase({ ...request, email: generateSignUp().email, code }),
		).rejects.toThrow(REFUSED);
	});
});

describe.each(["stg", "prd"] as const)("signUpUseCase in %s", (environment) => {
	const { bus } = integrationContextForEachTest({ environment, mailgun: {} });

	it("refuses 111111, even without a Mailgun key", async () => {
		const request = await requestCode(bus());

		await expect(signUpUseCase({ ...request, code: "111111" })).rejects.toThrow(
			REFUSED,
		);
	});
});

describe("signUpUseCase on a local API", () => {
	const { bus } = integrationContextForEachTest({ environment: "local" });

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
