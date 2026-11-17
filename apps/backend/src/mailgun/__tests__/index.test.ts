import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it } from "vitest";
import {
	createLogMailer,
	createMailgunMailer,
	MailgunRefusedError,
} from "@/mailgun";
import {
	type IMockMailgunServer,
	startMockMailgunServer,
} from "@/mailgun/__mocks__/mock-mailgun-server";
import { generateEmail } from "@/shared/__mocks__/generate-email";
import { createCapturingLogger } from "@/testing/test-logger";

let mailgun: IMockMailgunServer | undefined;

async function startMailgun(status: number | null) {
	mailgun = await startMockMailgunServer(status);
	return mailgun;
}

function mailerFor(server: IMockMailgunServer, timeoutMs?: number) {
	return createMailgunMailer({
		apiKey: faker.string.alphanumeric(32),
		domain: faker.internet.domainName(),
		from: faker.internet.email(),
		apiUrl: server.url,
		timeoutMs,
	});
}

afterEach(async () => {
	await mailgun?.close();
	mailgun = undefined;
});

describe("createMailgunMailer", () => {
	it("posts the email to the domain's messages, signed with the key", async () => {
		const server = await startMailgun(200);
		const apiKey = faker.string.alphanumeric(32);
		const domain = faker.internet.domainName();
		const from = faker.internet.email();
		const email = generateEmail();

		await createMailgunMailer({
			apiKey,
			domain,
			from,
			apiUrl: server.url,
		}).send(email);

		expect(server.received).toHaveLength(1);
		const [request] = server.received;
		expect(request).toMatchObject({
			method: "POST",
			url: `/v3/${domain}/messages`,
			auth: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
		});
		expect(Object.fromEntries(new URLSearchParams(request?.body))).toEqual({
			from,
			...email,
		});
	});

	it.each([
		[500, true],
		[503, true],
		[408, true],
		[429, true],
		[400, false],
		[401, false],
		[403, false],
	])(
		"throws MailgunRefusedError on a %i, retryable: %s",
		async (status, retryable) => {
			const server = await startMailgun(status);

			const sending = mailerFor(server).send(generateEmail());

			await expect(sending).rejects.toBeInstanceOf(MailgunRefusedError);
			await expect(sending).rejects.toMatchObject({ status, retryable });
		},
	);

	it("gives up on a send that stalls", async () => {
		const server = await startMailgun(null);

		const sending = mailerFor(server, 50).send(generateEmail());

		await expect(sending).rejects.toMatchObject({ name: "TimeoutError" });
	});
});

describe("createLogMailer", () => {
	it("logs the address and subject, never the body", async () => {
		const capture = createCapturingLogger();
		const email = generateEmail();

		await createLogMailer(capture.logger).send(email);

		const lines = capture.lines();
		expect(lines).toEqual([
			expect.objectContaining({
				to: email.to,
				subject: email.subject,
				msg: "email not sent: no MAILGUN_API_KEY",
			}),
		]);
		expect(JSON.stringify(lines)).not.toContain(email.html);
	});
});
