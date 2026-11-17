import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "@/services/migrate";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { createDbCloner, TEST_DB_URL_ENV } from "@/testing/test-db";

/** The tables in `url`'s public and drizzle schemas, sorted. */
async function tables(url: string): Promise<string[]> {
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		const { rows } = await client.query<{ name: string }>(
			"select table_schema || '.' || table_name as name from information_schema.tables where table_schema in ('public', 'drizzle') order by name",
		);
		return rows.map((row) => row.name);
	} finally {
		await client.end();
	}
}

describe("migrate", () => {
	integrationContextForEachTest();
	let cloner: ReturnType<typeof createDbCloner>;
	let empty: { url: string; drop: () => Promise<void> } | undefined;

	beforeAll(() => {
		cloner = createDbCloner(String(process.env[TEST_DB_URL_ENV]));
	});
	afterEach(async () => {
		await empty?.drop();
		empty = undefined;
	});
	afterAll(async () => {
		await cloner.close();
	});

	it("changes nothing without SHOULD_RUN_MIGRATION, not even connecting", async () => {
		// The generated database points nowhere: a connection would throw.
		const result = await migrate(generateConfig({ shouldRunMigration: false }));

		expect(result).toBe("skipped");
	});

	it("creates every table in an empty database with SHOULD_RUN_MIGRATION", async () => {
		empty = await cloner.createEmpty();
		const { url } = empty;
		expect(await tables(url)).toEqual([]);

		const result = await migrate(
			generateConfig({ shouldRunMigration: true, db: { url } }),
		);

		expect(result).toBe("applied");
		expect(await tables(url)).toEqual([
			"drizzle.__drizzle_migrations",
			"public.account",
			"public.rate_limit",
			"public.session",
			"public.user",
			"public.verification",
		]);
	});
});
