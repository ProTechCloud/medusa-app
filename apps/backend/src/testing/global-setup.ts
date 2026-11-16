import { runMigrations } from "@medusa/db/migrate";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { createDbCloner, TEST_DB_URL_ENV } from "./test-db";

/**
 * Vitest's global setup, once per run: one Postgres container, migrated and
 * snapshot as the template every test clones, so the whole suite pays for a
 * single container start and a single migration. The workers find it through
 * the environment.
 */
let container: StartedPostgreSqlContainer | undefined;

export async function setup(): Promise<void> {
	container = await new PostgreSqlContainer("postgres:16-alpine").start();
	const url = container.getConnectionUri();
	await runMigrations(url);

	const cloner = createDbCloner(url);
	await cloner.createTemplate();
	await cloner.close();

	process.env[TEST_DB_URL_ENV] = url;
}

export async function teardown(): Promise<void> {
	await container?.stop();
}
