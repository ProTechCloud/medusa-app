import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { mockPushVerifier } from "@/shared/__mocks__/mock-push-verifier";
import { mockReadBody } from "@/shared/__mocks__/mock-read-body";
import { useCaseContextForEachTest } from "@/testing/use-case-context";
import { deliverPushedEmailUseCase } from "@/use-cases/cases/deliver-pushed-email.use-case";

describe("deliverPushedEmailUseCase, with a push it does not trust", () => {
	useCaseContextForEachTest(() => ({ pushVerifier: mockPushVerifier(false) }));

	it("refuses it without reading its body", async () => {
		const readBody = mockReadBody();

		const result = await deliverPushedEmailUseCase({
			authorization: `Bearer ${faker.string.alphanumeric(40)}`,
			readBody,
		});

		expect(result).toBe("unauthorized");
		expect(readBody).not.toHaveBeenCalled();
	});
});
