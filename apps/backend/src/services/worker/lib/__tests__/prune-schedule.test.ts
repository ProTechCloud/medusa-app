import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import { rateLimit } from "@medusa/db";
import { DateTime } from "luxon";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startPruning } from "@/services/worker/lib/prune-schedule";
import { integrationContextForEachTest } from "@/testing/integration-context";

describe("startPruning", () => {
	const { ctx } = integrationContextForEachTest();
	let stop: (() => void) | undefined;

	afterEach(() => {
		stop?.();
		stop = undefined;
	});

	it("prunes the ended rate-limit windows on its interval", async () => {
		await ctx()
			.db.insert(rateLimit)
			.values({
				id: randomUUID(),
				key: `address:${faker.internet.email()}`,
				count: 1,
				lastRequest: DateTime.utc().minus({ hours: 1 }).toMillis(),
			});

		stop = startPruning(20);

		await vi.waitFor(async () => {
			expect(await ctx().db.select().from(rateLimit)).toEqual([]);
		});
	});
});
