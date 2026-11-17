import { faker } from "@faker-js/faker";
import { createEnvelope } from "@medusa/events";
import { describe, expect, it } from "vitest";
import { buildWorker } from "@/services/worker";
import { PUSH_EMAILS_PATH } from "@/services/worker/push-emails";
import { createMemoryMailer } from "@/shared/__mocks__/mock-mailer";
import { useCaseContextForEachTest } from "@/testing/use-case-context";

/** The body a Pub/Sub push subscription posts, around `data`. */
function pushBody(data: unknown): string {
	return JSON.stringify({
		message: {
			messageId: faker.string.numeric(16),
			data: Buffer.from(JSON.stringify(data)).toString("base64"),
		},
		subscription: faker.lorem.slug(),
	});
}

async function push(body: string): Promise<Response> {
	return await buildWorker().request(PUSH_EMAILS_PATH, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body,
	});
}

describe("the worker", () => {
	let mailer = createMemoryMailer();
	useCaseContextForEachTest(() => {
		mailer = createMemoryMailer();
		return { mailer };
	});

	it.each([
		["signup.code_requested", "Your Medusa sign-up code"],
		["password.reset_requested", "Your Medusa password reset code"],
	] as const)(
		"sends the email a pushed %s asks for, and acknowledges it",
		async (type, subject) => {
			const email = faker.internet.email();
			const code = faker.string.numeric(6);

			const response = await push(
				pushBody(createEnvelope(type, { email, code })),
			);

			expect(response.status).toBe(204);
			expect(mailer.sent).toEqual([
				{ to: email, subject, html: expect.stringContaining(code) },
			]);
		},
	);

	it.each([
		["a body that is not a push", JSON.stringify({ [faker.lorem.word()]: 1 })],
		["data that is not an envelope", pushBody({ type: faker.lorem.word() })],
	])("acknowledges %s and sends nothing", async (_, body) => {
		const response = await push(body);

		expect(response.status).toBe(204);
		expect(mailer.sent).toEqual([]);
	});

	it("answers a failed send with a 500, so Pub/Sub delivers it again", async () => {
		mailer.send = async () => {
			throw new Error(faker.lorem.sentence());
		};

		const response = await push(
			pushBody(
				createEnvelope("signup.code_requested", {
					email: faker.internet.email(),
					code: faker.string.numeric(6),
				}),
			),
		);

		expect(response.status).toBe(500);
	});

	it("the health check reports ok", async () => {
		const response = await buildWorker().request("/health");

		expect(response.status).toBe(200);
	});
});
