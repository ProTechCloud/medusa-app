import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { requestHeaders, signUpTestUser } from "@/testing/test-user";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";

describe("requestSignUpCodeUseCase", () => {
	const { bus } = integrationContextForEachTest();

	it("emails a 6-digit code to an address with no account", async () => {
		const { email } = generateSignUp();

		const result = await requestSignUpCodeUseCase({
			email,
			headers: requestHeaders(),
		});

		expect(result).toEqual({ sent: true });
		expect(bus().published).toEqual([
			expect.objectContaining({
				type: "signup.code_requested",
				data: { email, code: expect.stringMatching(/^\d{6}$/) },
			}),
		]);
	});

	it("emails nothing to an address that has an account, and answers the same", async () => {
		const { email } = await signUpTestUser(bus());
		const before = bus().published.length;

		const result = await requestSignUpCodeUseCase({
			email,
			headers: requestHeaders(),
		});

		expect(result).toEqual({ sent: true });
		expect(bus().published).toHaveLength(before);
	});
});
