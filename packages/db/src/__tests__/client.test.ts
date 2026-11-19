import { faker } from "@faker-js/faker";
import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDb, databaseUrl } from "#src/index.ts";
import { runMigrations } from "#src/lib/migrate.ts";

// A port nothing listens on: the pool connects only on a query, and a
// migration against it fails at once.
const UNREACHABLE = databaseUrl({
	DB_HOST: "127.0.0.1",
	DB_PORT: 1,
	DB_NAME: "medusa",
	DB_USER: "medusa",
	DB_PASSWORD: "medusa",
});

describe("databaseUrl", () => {
	it("escapes a user and password holding @, : or /", () => {
		expect(
			databaseUrl({
				DB_HOST: "db.internal",
				DB_PORT: 5432,
				DB_NAME: "medusa",
				DB_USER: "app:user",
				DB_PASSWORD: "p@ss/word",
			}),
		).toBe("postgresql://app%3Auser:p%40ss%2Fword@db.internal:5432/medusa");
	});
});

describe("createDb", () => {
	it("hands an idle connection's error to the caller instead of throwing it", async () => {
		const errors: Error[] = [];
		const db = createDb(UNREACHABLE, (error) => errors.push(error));
		const error = new Error(faker.lorem.sentence());

		db.$client.emit("error", error);
		await db.$client.end();

		expect(errors).toEqual([error]);
	});
});

// A migration that applies is tested in @medusa/backend, whose tests run a
// Postgres: `services/migrate/__tests__`.
describe("runMigrations", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("rejects when the database does not answer, and closes its pool", async () => {
		const end = vi.spyOn(pg.Pool.prototype, "end");

		await expect(runMigrations(UNREACHABLE)).rejects.toThrow();

		expect(end).toHaveBeenCalledOnce();
	});
});
