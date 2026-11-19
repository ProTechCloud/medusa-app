import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { DOMAIN_ERROR_NAMES } from "@/shared/domain-errors";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { lastCode, requestHeaders, signUpTestUser } from "@/testing/test-user";
import { loadMeUseCase } from "@/use-cases/cases/load-me.use-case";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { resetPasswordUseCase } from "@/use-cases/cases/reset-password.use-case";
import { signInUseCase } from "@/use-cases/cases/sign-in.use-case";

describe("requestPasswordResetUseCase", () => {
	const { bus } = integrationContextForEachTest();

	it("emails a code to an address that has an account", async () => {
		const { email } = await signUpTestUser(bus());

		await requestPasswordResetUseCase({ email, headers: requestHeaders() });

		expect(lastCode(bus(), "password.reset_requested", email)).toMatch(
			/^\d{6}$/,
		);
	});

	it("emails nothing to an address with no account, and answers the same", async () => {
		const { email } = generateSignUp();

		const result = await requestPasswordResetUseCase({
			email,
			headers: requestHeaders(),
		});

		expect(result).toEqual({ sent: true });
		expect(bus().published).toEqual([]);
	});

	it("refuses the eleventh request for one address with TOO_MANY_REQUESTS", async () => {
		const { email } = generateSignUp();
		const request = () =>
			requestPasswordResetUseCase({ email, headers: requestHeaders() });
		for (let attempt = 1; attempt <= 10; attempt++) {
			await expect(request()).resolves.toEqual({ sent: true });
		}

		await expect(request()).rejects.toMatchObject({
			name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		});
	});
});

describe("resetPasswordUseCase", () => {
	const { bus } = integrationContextForEachTest();

	async function requestReset() {
		const user = await signUpTestUser(bus());
		await requestPasswordResetUseCase({
			email: user.email,
			headers: requestHeaders(),
		});
		const code = lastCode(bus(), "password.reset_requested", user.email);
		return { user, code };
	}

	it("sets the new password and ends every session of the account", async () => {
		const { user, code } = await requestReset();
		const newPassword = faker.internet.password({ length: 16 });

		await resetPasswordUseCase({
			email: user.email,
			code,
			newPassword,
			headers: requestHeaders(),
		});

		await expect(
			loadMeUseCase({ headers: requestHeaders(user.token) }),
		).resolves.toBeNull();
		await expect(
			signInUseCase({
				email: user.email,
				password: user.password,
				headers: requestHeaders(),
			}),
		).rejects.toThrow("Wrong email or password.");
		await expect(
			signInUseCase({
				email: user.email,
				password: newPassword,
				headers: requestHeaders(),
			}),
		).resolves.toMatchObject({ user: { email: user.email } });
	});

	it("keeps the code when the new password is too short", async () => {
		const { user, code } = await requestReset();
		const reset = {
			email: user.email,
			code,
			headers: requestHeaders(),
		};
		await expect(
			resetPasswordUseCase({ ...reset, newPassword: faker.string.alpha(4) }),
		).rejects.toThrow("at least 8 characters");

		await expect(
			resetPasswordUseCase({
				...reset,
				newPassword: faker.internet.password({ length: 16 }),
			}),
		).resolves.toBe(true);
	});

	it("refuses a sign-up code", async () => {
		const user = generateSignUp();
		await requestSignUpCodeUseCase({
			email: user.email,
			headers: requestHeaders(),
		});

		await expect(
			resetPasswordUseCase({
				email: user.email,
				code: lastCode(bus(), "signup.code_requested", user.email),
				newPassword: faker.internet.password({ length: 16 }),
				headers: requestHeaders(),
			}),
		).rejects.toThrow("The code is wrong or has expired.");
	});

	it("refuses the eleventh guess for one address with TOO_MANY_REQUESTS", async () => {
		const { email } = generateSignUp();
		const guess = () =>
			resetPasswordUseCase({
				email,
				code: faker.string.numeric(6),
				newPassword: faker.internet.password({ length: 16 }),
				headers: requestHeaders(),
			});
		for (let attempt = 1; attempt <= 10; attempt++) {
			await expect(guess()).rejects.toThrow(
				"The code is wrong or has expired.",
			);
		}

		await expect(guess()).rejects.toMatchObject({
			name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		});
	});
});

describe.each(["stg", "prd"] as const)(
	"resetPasswordUseCase in %s",
	(environment) => {
		const { bus } = integrationContextForEachTest({ environment, mailgun: {} });

		it("refuses 111111, even without a Mailgun key", async () => {
			const { email, password } = await signUpTestUser(bus());
			await requestPasswordResetUseCase({ email, headers: requestHeaders() });

			await expect(
				resetPasswordUseCase({
					email,
					code: "111111",
					newPassword: faker.internet.password({ length: 16 }),
					headers: requestHeaders(),
				}),
			).rejects.toThrow("The code is wrong or has expired.");
			await expect(
				signInUseCase({ email, password, headers: requestHeaders() }),
			).resolves.toMatchObject({ user: { email } });
		});
	},
);
