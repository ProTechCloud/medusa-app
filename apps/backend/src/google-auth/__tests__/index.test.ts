import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
	createClosedPushVerifier,
	createGooglePushVerifier,
	createLocalPushVerifier,
} from "@/google-auth";
import {
	generatePushToken,
	generateSigningKey,
	mockFailingGetCerts,
	mockGetCerts,
} from "@/google-auth/__mocks__/generate-push-token";
import { createCapturingLogger } from "@/testing/test-logger";

describe("createGooglePushVerifier", () => {
	const key = generateSigningKey();
	const audience = faker.internet.url();
	const serviceAccount = faker.internet.email();
	const verifier = createGooglePushVerifier({
		audience,
		serviceAccount,
		getCerts: mockGetCerts(key),
	});

	it("trusts a token for its audience, from its service account", async () => {
		const token = generatePushToken(key, {
			aud: audience,
			email: serviceAccount,
		});

		await expect(verifier.verify(`Bearer ${token}`)).resolves.toBe(true);
	});

	it.each([
		["no header", () => undefined],
		["a header that is not a bearer token", () => faker.lorem.word()],
		[
			"another audience",
			() =>
				`Bearer ${generatePushToken(key, { aud: faker.internet.url(), email: serviceAccount })}`,
		],
		[
			"another service account",
			() =>
				`Bearer ${generatePushToken(key, { aud: audience, email: faker.internet.email() })}`,
		],
		[
			"an unverified email",
			() =>
				`Bearer ${generatePushToken(key, { aud: audience, email: serviceAccount, email_verified: false })}`,
		],
		[
			"an expired token",
			() => {
				const past = Math.floor(DateTime.utc().minus({ hours: 2 }).toSeconds());
				return `Bearer ${generatePushToken(key, { aud: audience, email: serviceAccount, iat: past - 3600, exp: past })}`;
			},
		],
		[
			"a token signed by another key",
			() =>
				`Bearer ${generatePushToken({ ...generateSigningKey(), kid: key.kid }, { aud: audience, email: serviceAccount })}`,
		],
	])("refuses %s", async (_, authorization) => {
		await expect(verifier.verify(authorization())).resolves.toBe(false);
	});
});

describe("createGooglePushVerifier, when Google's certificates cannot be fetched", () => {
	it("throws instead of refusing, so the push is retried", async () => {
		const key = generateSigningKey();
		const verifier = createGooglePushVerifier({
			audience: faker.internet.url(),
			serviceAccount: faker.internet.email(),
			getCerts: mockFailingGetCerts(),
		});

		await expect(
			verifier.verify(`Bearer ${generatePushToken(key)}`),
		).rejects.toThrow("certificates");
	});
});

describe("createLocalPushVerifier", () => {
	it("trusts a push with no token, as the emulator sends it", async () => {
		await expect(createLocalPushVerifier().verify(undefined)).resolves.toBe(
			true,
		);
	});
});

describe("createClosedPushVerifier", () => {
	it("refuses every push, and logs that the push variables are missing", async () => {
		const capture = createCapturingLogger();

		const trusted = await createClosedPushVerifier(capture.logger).verify(
			`Bearer ${faker.string.alphanumeric(40)}`,
		);

		expect(trusted).toBe(false);
		expect(capture.lines()).toEqual([
			expect.objectContaining({
				level: 50,
				msg: expect.stringContaining("PUBSUB_PUSH_AUDIENCE"),
			}),
		]);
	});
});
