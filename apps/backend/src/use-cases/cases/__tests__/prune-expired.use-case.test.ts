import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import { rateLimit, verification } from "@medusa/db";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { pruneExpiredUseCase } from "@/use-cases/cases/prune-expired.use-case";

describe("pruneExpiredUseCase", () => {
	const { ctx } = integrationContextForEachTest();

	it("deletes the ended rate-limit windows and expired codes, and keeps the rest", async () => {
		const now = DateTime.utc();
		const ended = `address:${faker.internet.email()}`;
		const open = `address:${faker.internet.email()}`;
		await ctx()
			.db.insert(rateLimit)
			.values([
				{
					id: randomUUID(),
					key: ended,
					count: 3,
					lastRequest: now.minus({ minutes: 16 }).toMillis(),
				},
				{
					id: randomUUID(),
					key: open,
					count: 3,
					lastRequest: now.minus({ minutes: 14 }).toMillis(),
				},
			]);
		const expired = `sign-up:${faker.internet.email()}`;
		const live = `sign-up:${faker.internet.email()}`;
		await ctx()
			.db.insert(verification)
			.values([
				{
					id: randomUUID(),
					identifier: expired,
					value: faker.string.alphanumeric(20),
					expiresAt: now.minus({ minutes: 1 }).toJSDate(),
				},
				{
					id: randomUUID(),
					identifier: live,
					value: faker.string.alphanumeric(20),
					expiresAt: now.plus({ minutes: 1 }).toJSDate(),
				},
			]);

		const pruned = await pruneExpiredUseCase();

		expect(pruned).toEqual({ rateLimits: 1, codes: 1 });
		const keys = await ctx().db.select({ key: rateLimit.key }).from(rateLimit);
		expect(keys).toEqual([{ key: open }]);
		const codes = await ctx()
			.db.select({ identifier: verification.identifier })
			.from(verification);
		expect(codes).toEqual([{ identifier: live }]);
	});
});
