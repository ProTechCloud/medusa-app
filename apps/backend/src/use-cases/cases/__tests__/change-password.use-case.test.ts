import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { DOMAIN_ERROR_NAMES } from "@/shared/domain-errors";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { requestHeaders, signUpTestUser } from "@/testing/test-user";
import { changePasswordUseCase } from "@/use-cases/cases/change-password.use-case";
import { loadMeUseCase } from "@/use-cases/cases/load-me.use-case";
import { signInUseCase } from "@/use-cases/cases/sign-in.use-case";

describe("changePasswordUseCase", () => {
	const { bus } = integrationContextForEachTest();

	it("sets the new password, ends every old session, and opens a new one", async () => {
		const user = await signUpTestUser(bus());
		const other = await signInUseCase({
			email: user.email,
			password: user.password,
			headers: requestHeaders(),
		});
		const newPassword = faker.internet.password({ length: 16 });

		const { token } = await changePasswordUseCase({
			currentPassword: user.password,
			newPassword,
			headers: requestHeaders(user.token),
		});

		for (const old of [user.token, other.token]) {
			await expect(
				loadMeUseCase({ headers: requestHeaders(old) }),
			).resolves.toBeNull();
		}
		await expect(
			loadMeUseCase({ headers: requestHeaders(token) }),
		).resolves.toMatchObject({ email: user.email });
		await expect(
			signInUseCase({
				email: user.email,
				password: newPassword,
				headers: requestHeaders(),
			}),
		).resolves.toMatchObject({ user: { email: user.email } });
	});

	it("refuses a wrong current password", async () => {
		const user = await signUpTestUser(bus());

		await expect(
			changePasswordUseCase({
				currentPassword: faker.internet.password({ length: 16 }),
				newPassword: faker.internet.password({ length: 16 }),
				headers: requestHeaders(user.token),
			}),
		).rejects.toThrow("The current password is wrong.");
	});

	it("counts each guess against the account's address, and refuses the eleventh", async () => {
		const user = await signUpTestUser(bus());
		const guess = () =>
			changePasswordUseCase({
				currentPassword: faker.internet.password({ length: 16 }),
				newPassword: faker.internet.password({ length: 16 }),
				headers: requestHeaders(user.token),
			});
		// The code request and the sign-up were the address's first two.
		for (let attempt = 3; attempt <= 10; attempt++) {
			await expect(guess()).rejects.toThrow("The current password is wrong.");
		}

		await expect(guess()).rejects.toMatchObject({
			name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		});
	});

	it("needs a session", async () => {
		await expect(
			changePasswordUseCase({
				currentPassword: faker.internet.password({ length: 16 }),
				newPassword: faker.internet.password({ length: 16 }),
				headers: requestHeaders(),
			}),
		).rejects.toThrow("Sign in first.");
	});
});
