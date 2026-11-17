import { describe, expect, it } from "vitest";
import { migrate } from "@/services/migrate";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { integrationContextForEachTest } from "@/testing/integration-context";

describe("migrate", () => {
	const { ctx } = integrationContextForEachTest();

	it("changes nothing without SHOULD_RUN_MIGRATION, not even connecting", async () => {
		// The generated database points nowhere: a connection would throw.
		const result = await migrate(generateConfig({ shouldRunMigration: false }));

		expect(result).toBe("skipped");
	});

	it("applies the migrations with SHOULD_RUN_MIGRATION, and again finds none to apply", async () => {
		const config = { ...ctx().config, shouldRunMigration: true };

		await expect(migrate(config)).resolves.toBe("applied");
		await expect(migrate(config)).resolves.toBe("applied");

		const { rows } = await ctx().db.$client.query(
			"select count(*)::int as count from drizzle.__drizzle_migrations",
		);
		expect(rows).toEqual([{ count: 1 }]);
	});
});
