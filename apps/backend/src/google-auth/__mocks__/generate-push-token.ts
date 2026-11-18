import { generateKeyPairSync, sign } from "node:crypto";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";

/**
 * A signing key of our own, standing in for Google's: `certs` is what
 * `createGooglePushVerifier` is given in place of Google's certificates.
 */
export function generateSigningKey() {
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
	});
	const kid = faker.string.hexadecimal({ length: 40, prefix: "" });
	return {
		kid,
		privateKey,
		certs: {
			[kid]: publicKey.export({ type: "spki", format: "pem" }) as string,
		},
	};
}

/**
 * Hands `createGooglePushVerifier` the key's certificates, in place of
 * fetching Google's.
 */
export function mockGetCerts(key: ReturnType<typeof generateSigningKey>) {
	return async () => key.certs;
}

function base64url(value: unknown): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * An RS256 token as a push subscription sends it, signed with `key`, with
 * Google's claims; `claims` overrides any of them.
 */
export function generatePushToken(
	key: ReturnType<typeof generateSigningKey>,
	claims: Record<string, unknown> = {},
): string {
	const now = Math.floor(DateTime.utc().toSeconds());
	const header = base64url({ alg: "RS256", typ: "JWT", kid: key.kid });
	const payload = base64url({
		iss: "https://accounts.google.com",
		aud: faker.internet.url(),
		email: faker.internet.email(),
		email_verified: true,
		sub: faker.string.numeric(21),
		iat: now,
		exp: now + 3600,
		...claims,
	});
	const signature = sign(
		"RSA-SHA256",
		Buffer.from(`${header}.${payload}`),
		key.privateKey,
	).toString("base64url");
	return `${header}.${payload}.${signature}`;
}
