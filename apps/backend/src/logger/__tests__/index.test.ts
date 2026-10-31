import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createLogger } from "@/logger";
import { createCapturingStream } from "@/logger/__mocks__/mock-log-stream";
import { withCorrelationId } from "@/opentelemetry/lib/log-correlation";
import { withRequestIdentity } from "@/posthog";

function generateBase() {
	return {
		service: faker.lorem.slug(),
		environment: faker.helpers.arrayElement(["local", "stg", "prd"]),
		version: faker.system.semver(),
	};
}

describe("createLogger", () => {
	it("writes the time in UTC, the level by name, the base fields and the message", () => {
		const base = generateBase();
		const { stream, lines } = createCapturingStream();
		const msg = faker.lorem.sentence();

		createLogger({
			base,
			streams: [{ level: "info", stream }],
			level: "info",
		}).info(msg);

		const [line] = lines();
		expect(line).toEqual({
			...base,
			level: "info",
			time: expect.stringMatching(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			),
			msg,
		});
	});

	it("adds the request's correlation ID and PostHog identity", () => {
		const { stream, lines } = createCapturingStream();
		const logger = createLogger({
			base: generateBase(),
			streams: [{ level: "info", stream }],
			level: "info",
		});
		const correlationId = faker.string.uuid();
		const identity = {
			distinctId: faker.string.uuid(),
			sessionId: faker.string.uuid(),
		};

		withCorrelationId(correlationId, () =>
			withRequestIdentity(identity, () => logger.info(faker.lorem.sentence())),
		);

		expect(lines()[0]).toMatchObject({
			correlationId,
			posthogDistinctId: identity.distinctId,
			posthogSessionId: identity.sessionId,
		});
	});

	it.each([
		"password",
		"newPassword",
		"currentPassword",
		"token",
		"accessToken",
		"refreshToken",
		"idToken",
		"pushToken",
		"authorization",
		"cookie",
		"email",
	])(
		"replaces %s with [redacted] at the top level and one level down",
		(key) => {
			const { stream, lines } = createCapturingStream();
			const secret = faker.string.alphanumeric(24);
			const parent = faker.lorem.word();

			createLogger({
				base: generateBase(),
				streams: [{ level: "info", stream }],
				level: "info",
			}).info(
				{ [key]: secret, [parent]: { [key]: secret } },
				faker.lorem.sentence(),
			);

			const [line] = lines();
			expect(line?.[key]).toBe("[redacted]");
			const nested = line?.[parent] as Record<string, unknown> | undefined;
			expect(nested?.[key]).toBe("[redacted]");
			expect(JSON.stringify(line)).not.toContain(secret);
		},
	);

	it("writes a line only to the streams whose level it reaches", () => {
		const stdout = createCapturingStream();
		const posthog = createCapturingStream();
		const logger = createLogger({
			base: generateBase(),
			streams: [
				{ level: "info", stream: stdout.stream },
				{ level: "warn", stream: posthog.stream },
			],
			level: "info",
		});

		logger.info(faker.lorem.sentence());
		logger.warn(faker.lorem.sentence());

		expect(stdout.lines().map((line) => line.level)).toEqual(["info", "warn"]);
		expect(posthog.lines().map((line) => line.level)).toEqual(["warn"]);
	});
});
