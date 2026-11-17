import { once } from "node:events";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it } from "vitest";
import { createLogMailer, createMailgunMailer } from "@/mailgun";
import { createCapturingLogger } from "@/testing/test-logger";

type TReceived = { method?: string; url?: string; auth?: string; body: string };

let server: Server | undefined;

/** A stand-in for Mailgun's API that answers `status` and keeps what it got. */
async function startMailgun(
	status: number,
): Promise<{ url: string; received: TReceived[] }> {
	const received: TReceived[] = [];
	server = createServer(async (request: IncomingMessage, response) => {
		let body = "";
		for await (const chunk of request) body += chunk;
		received.push({
			method: request.method,
			url: request.url,
			auth: request.headers.authorization,
			body,
		});
		response.writeHead(status).end(faker.lorem.sentence());
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const { port } = server.address() as AddressInfo;
	return { url: `http://127.0.0.1:${port}`, received };
}

function generateEmail() {
	return {
		to: faker.internet.email(),
		subject: faker.lorem.sentence(),
		html: `<p>${faker.lorem.sentence()}</p>`,
	};
}

afterEach(async () => {
	server?.close();
	await (server ? once(server, "close") : undefined);
	server = undefined;
});

describe("createMailgunMailer", () => {
	it("posts the email to the domain's messages, signed with the key", async () => {
		const mailgun = await startMailgun(200);
		const apiKey = faker.string.alphanumeric(32);
		const domain = faker.internet.domainName();
		const from = faker.internet.email();
		const email = generateEmail();

		await createMailgunMailer({
			apiKey,
			domain,
			from,
			apiUrl: mailgun.url,
		}).send(email);

		expect(mailgun.received).toHaveLength(1);
		const [request] = mailgun.received;
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

	it("throws with Mailgun's status when it refuses", async () => {
		const mailgun = await startMailgun(401);

		const sending = createMailgunMailer({
			apiKey: faker.string.alphanumeric(32),
			domain: faker.internet.domainName(),
			from: faker.internet.email(),
			apiUrl: mailgun.url,
		}).send(generateEmail());

		await expect(sending).rejects.toThrow("Mailgun refused the email with 401");
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
