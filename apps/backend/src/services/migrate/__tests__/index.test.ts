import { faker } from "@faker-js/faker";
import { createAdminPool } from "@medusa/db/testing";
import { DateTime } from "luxon";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "@/services/migrate";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { createDbCloner, TEST_DB_URL_ENV } from "@/testing/test-db";
import { ctxForTests, resetCtx } from "@/use-cases";

/** Runs one statement on `url` and returns its rows. */
async function query<TRow>(
	url: string,
	text: string,
	values: unknown[] = [],
): Promise<TRow[]> {
	const pool = createAdminPool(url, 1);
	try {
		return (await pool.query(text, values)).rows as TRow[];
	} finally {
		await pool.end();
	}
}

/** The tables in `url`'s public and drizzle schemas, sorted. */
async function tables(url: string): Promise<string[]> {
	const rows = await query<{ name: string }>(
		url,
		"select table_schema || '.' || table_name as name from information_schema.tables where table_schema in ('public', 'drizzle') order by name",
	);
	return rows.map((row) => row.name);
}

describe("migrate", () => {
	let cloner: ReturnType<typeof createDbCloner>;
	let empty: { url: string; drop: () => Promise<void> } | undefined;

	beforeAll(() => {
		cloner = createDbCloner(String(process.env[TEST_DB_URL_ENV]));
	});
	afterEach(async () => {
		// `migrate` built the context the prune ran in; close its pool before
		// the database goes.
		if (empty) {
			await ctxForTests().db.$client.end();
			resetCtx();
		}
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

	it("creates every table in an empty database with SHOULD_RUN_MIGRATION, and prunes that one", async () => {
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
		expect(ctxForTests().config.db.url).toBe(url);
	});

	it("prunes an expired code each time it runs", async () => {
		empty = await cloner.createEmpty();
		const { url } = empty;
		const config = generateConfig({ shouldRunMigration: true, db: { url } });
		await migrate(config);
		await query(
			url,
			"insert into verification (id, identifier, value, expires_at) values ($1, $2, $3, $4)",
			[
				faker.string.uuid(),
				`sign-up:${faker.internet.email()}`,
				faker.string.alphanumeric(64),
				// An ISO string with its offset, so the stored time does not
				// depend on the machine's time zone.
				DateTime.utc().minus({ minutes: 1 }).toISO(),
			],
		);

		await migrate(config);

		expect(await query(url, "select id from verification")).toEqual([]);
	});
});
