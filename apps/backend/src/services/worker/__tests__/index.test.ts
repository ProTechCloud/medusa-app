import { faker } from "@faker-js/faker";
import { generateEmailEnvelope } from "@medusa/emails/testing";
import { describe, expect, it } from "vitest";
import { MailgunRefusedError } from "@/mailgun";
import { buildWorker } from "@/services/worker";
import { PUSH_EMAILS_PATH } from "@/services/worker/lib/push-emails";
import { mockFailingMailer, mockMailer } from "@/shared/__mocks__/mock-mailer";
import { mockPushVerifier } from "@/shared/__mocks__/mock-push-verifier";
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

function signUpCodePush(): string {
	return pushBody(generateEmailEnvelope("signup.code_requested"));
}

async function push(body: string): Promise<Response> {
	return await buildWorker().request(PUSH_EMAILS_PATH, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${faker.string.alphanumeric(40)}`,
		},
		body,
	});
}

describe("the worker, with a trusted push", () => {
	let mailer = mockMailer();
	useCaseContextForEachTest(() => {
		mailer = mockMailer();
		return { mailer };
	});

	it.each([
		["signup.code_requested", "Your Medusa sign-up code"],
		["password.reset_requested", "Your Medusa password reset code"],
	] as const)(
		"sends the email a pushed %s asks for, and acknowledges it",
		async (type, subject) => {
			const envelope = generateEmailEnvelope(type);
			const { email, code } = envelope.data;

			const response = await push(pushBody(envelope));

			expect(response.status).toBe(204);
			expect(mailer.sent).toEqual([
				{ to: email, subject, html: expect.stringContaining(code) },
			]);
		},
	);

	it.each([
		["a body that is not JSON", faker.lorem.sentence()],
		["a body that is not a push", JSON.stringify({ [faker.lorem.word()]: 1 })],
		["data that is not an envelope", pushBody({ type: faker.lorem.word() })],
	])("acknowledges %s and sends nothing", async (_, body) => {
		const response = await push(body);

		expect(response.status).toBe(204);
		expect(mailer.sent).toEqual([]);
	});

	it("the health check reports ok", async () => {
		const response = await buildWorker().request("/health");

		expect(response.status).toBe(200);
	});
});

describe("the worker, with a push it does not trust", () => {
	const mailer = mockMailer();
	useCaseContextForEachTest(() => ({
		mailer,
		pushVerifier: mockPushVerifier(false),
	}));

	it("answers with a 401, and sends nothing", async () => {
		const response = await push(signUpCodePush());

		expect(response.status).toBe(401);
		expect(mailer.sent).toEqual([]);
	});
});

describe.each([
	[
		"Mailgun failing",
		() => new MailgunRefusedError(503, faker.lorem.sentence()),
	],
	[
		"Mailgun's rate limit",
		() => new MailgunRefusedError(429, faker.lorem.sentence()),
	],
	["a timeout", () => new MailgunRefusedError(408, faker.lorem.sentence())],
	["any other error", () => new Error(faker.lorem.sentence())],
])("the worker, when a send meets %s", (_, error) => {
	useCaseContextForEachTest(() => ({ mailer: mockFailingMailer(error()) }));

	it("answers with a 500, so Pub/Sub delivers the push again", async () => {
		const response = await push(signUpCodePush());

		expect(response.status).toBe(500);
	});
});

describe.each([400, 401, 403])(
	"the worker, when Mailgun refuses a send with a %i",
	(status) => {
		useCaseContextForEachTest(() => ({
			mailer: mockFailingMailer(
				new MailgunRefusedError(status, faker.lorem.sentence()),
			),
		}));

		it("acknowledges the push, since no retry would succeed", async () => {
			const response = await push(signUpCodePush());

			expect(response.status).toBe(204);
		});
	},
);
