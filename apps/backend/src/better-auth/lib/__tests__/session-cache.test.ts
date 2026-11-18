import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateSession } from "@/better-auth/lib/__mocks__/generate-session";
import { mockGetSession } from "@/better-auth/lib/__mocks__/mock-get-session";
import { createSessionCache } from "@/better-auth/lib/session-cache";
import { requestHeaders } from "@/testing/test-user";

// The TTL itself is lru-cache's, tested upstream; its clock is
// `performance.now()`, which fake timers do not move.
describe("createSessionCache", () => {
	it("serves a token's second lookup from the cache", async () => {
		const fake = mockGetSession();
		const session = generateSession();
		fake.answer(session);
		const cache = createSessionCache(fake.getSession);
		const token = faker.string.alphanumeric(32);

		await cache.get(requestHeaders(token));
		const second = await cache.get(requestHeaders(token));

		expect(second).toEqual(session);
		expect(fake.calls()).toBe(1);
	});

	it("looks a token up once while concurrent requests wait for it", async () => {
		const fake = mockGetSession();
		const settle = fake.answerLater();
		const cache = createSessionCache(fake.getSession);
		const token = faker.string.alphanumeric(32);

		const lookups = [1, 2, 3].map(() => cache.get(requestHeaders(token)));
		settle(generateSession());
		await Promise.all(lookups);

		expect(fake.calls()).toBe(1);
	});

	it.each([
		["no authorization header", new Headers()],
		["a non-bearer scheme", new Headers({ authorization: "Basic abc" })],
		[
			"a bearer scheme with no token",
			new Headers({ authorization: "Bearer " }),
		],
	])("asks every time for a request with %s", async (_, headers) => {
		const fake = mockGetSession();
		fake.answer(generateSession(), generateSession());
		const cache = createSessionCache(fake.getSession);

		await cache.get(headers);
		await cache.get(headers);

		expect(fake.calls()).toBe(2);
	});

	it("does not remember a token that had no session", async () => {
		const fake = mockGetSession();
		const session = generateSession();
		fake.answer(null, session);
		const cache = createSessionCache(fake.getSession);
		const token = faker.string.alphanumeric(32);

		const first = await cache.get(requestHeaders(token));
		const second = await cache.get(requestHeaders(token));

		expect(first).toBeNull();
		expect(second).toEqual(session);
	});

	it("looks a token up again after sign-out evicts it", async () => {
		const fake = mockGetSession();
		fake.answer(generateSession(), null);
		const cache = createSessionCache(fake.getSession);
		const token = faker.string.alphanumeric(32);

		await cache.get(requestHeaders(token));
		cache.invalidateByToken(token);
		const after = await cache.get(requestHeaders(token));

		expect(after).toBeNull();
	});

	it("does not keep a session whose sign-out landed while it was being looked up", async () => {
		const fake = mockGetSession();
		const settle = fake.answerLater();
		fake.answer(null);
		const cache = createSessionCache(fake.getSession);
		const token = faker.string.alphanumeric(32);

		const pending = cache.get(requestHeaders(token));
		cache.invalidateByToken(token);
		settle(generateSession());
		await pending;
		const after = await cache.get(requestHeaders(token));

		expect(after).toBeNull();
	});

	it("keeps other tokens' sessions when one signs out", async () => {
		const fake = mockGetSession();
		const kept = generateSession();
		fake.answer(generateSession(), kept);
		const cache = createSessionCache(fake.getSession);
		const signedOut = faker.string.alphanumeric(32);
		const other = faker.string.alphanumeric(33);

		await cache.get(requestHeaders(signedOut));
		await cache.get(requestHeaders(other));
		cache.invalidateByToken(signedOut);
		const otherAgain = await cache.get(requestHeaders(other));

		expect(otherAgain).toEqual(kept);
		expect(fake.calls()).toBe(2);
	});
});
