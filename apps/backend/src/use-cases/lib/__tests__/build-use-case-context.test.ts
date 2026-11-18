import { faker } from "@faker-js/faker";
import { generateEmail } from "@medusa/emails/testing";
import { createMemoryBus } from "@medusa/events";
import { describe, expect, it } from "vitest";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { mockMailer } from "@/shared/__mocks__/mock-mailer";
import { mockPushVerifier } from "@/shared/__mocks__/mock-push-verifier";
import { createCapturingLogger } from "@/testing/test-logger";
import {
	buildUseCaseContext,
	chooseServiceClients,
} from "@/use-cases/lib/build-use-case-context";

const ANY_TOKEN = `Bearer ${faker.string.alphanumeric(40)}`;

describe("chooseServiceClients", () => {
	it("logs an email instead of sending it without a Mailgun key", async () => {
		const capture = createCapturingLogger();
		const { mailer } = chooseServiceClients(
			generateConfig({ mailgun: {} }),
			capture.logger,
		);

		await mailer.send(generateEmail());

		expect(capture.lines()).toEqual([
			expect.objectContaining({ msg: "email not sent: no MAILGUN_API_KEY" }),
		]);
	});

	it("checks Google's token with the push variables, so a push without one is refused", async () => {
		const capture = createCapturingLogger();
		const { pushVerifier } = chooseServiceClients(
			generateConfig(),
			capture.logger,
		);

		// No token, so nothing is fetched: the refusal is the Google verifier's
		// own, not the closed one's, which would log.
		await expect(pushVerifier.verify(undefined)).resolves.toBe(false);
		expect(capture.lines()).toEqual([]);
	});

	it("trusts every push on a local worker without the push variables", async () => {
		const config = generateConfig({ environment: "local" });
		const { pushVerifier } = chooseServiceClients(
			{ ...config, pubsub: { ...config.pubsub, push: undefined } },
			createCapturingLogger().logger,
		);

		await expect(pushVerifier.verify(undefined)).resolves.toBe(true);
	});

	it.each(["stg", "prd"] as const)(
		"refuses every push in %s without the push variables, and says why",
		async (environment) => {
			const capture = createCapturingLogger();
			const config = generateConfig({ environment });
			const { pushVerifier } = chooseServiceClients(
				{ ...config, pubsub: { ...config.pubsub, push: undefined } },
				capture.logger,
			);

			await expect(pushVerifier.verify(ANY_TOKEN)).resolves.toBe(false);
			expect(capture.lines()).toEqual([
				expect.objectContaining({
					msg: expect.stringContaining("PUBSUB_PUSH_AUDIENCE"),
				}),
			]);
		},
	);
});

describe("buildUseCaseContext", () => {
	it("logs an idle database connection's error instead of throwing it", async () => {
		const capture = createCapturingLogger();
		const { db } = buildUseCaseContext({
			config: generateConfig(),
			logger: capture.logger,
			bus: createMemoryBus(),
			mailer: mockMailer(),
			pushVerifier: mockPushVerifier(true),
		});
		const message = faker.lorem.sentence();

		db.$client.emit("error", new Error(message));
		await db.$client.end();

		expect(capture.lines()).toEqual([
			expect.objectContaining({
				level: 50,
				msg: "idle database connection lost",
				err: expect.objectContaining({ message }),
			}),
		]);
	});
});
