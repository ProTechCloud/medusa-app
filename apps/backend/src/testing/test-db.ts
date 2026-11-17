import pg from "pg";

/** Where the global setup leaves the migrated database's connection string. */
export const TEST_DB_URL_ENV = "MEDUSA_TEST_DB_URL";

const TEMPLATE = "medusa_template";

let cloneCounter = 0;

type TTestDb = { url: string; drop: () => Promise<void> };

function withDatabase(connectionString: string, name: string): string {
	const url = new URL(connectionString);
	url.pathname = `/${name}`;
	return url.toString();
}

/**
 * Fresh databases forked from a migrated one with `CREATE DATABASE ...
 * TEMPLATE`, which takes milliseconds where migrating again takes seconds.
 * `createTemplate` snapshots the migrated database once; `clone` gives a test
 * its own copy, `createEmpty` an unmigrated one, and `drop` removes either.
 */
export function createDbCloner(connectionString: string) {
	const baseName = new URL(connectionString).pathname.slice(1);
	const admin = new pg.Pool({
		connectionString: withDatabase(connectionString, "postgres"),
		max: 5,
	});

	async function terminate(name: string): Promise<void> {
		await admin.query(
			"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
			[name],
		);
	}

	async function create(template: string): Promise<TTestDb> {
		cloneCounter += 1;
		const name = `medusa_t${process.pid}_${cloneCounter}`;
		await admin.query(`CREATE DATABASE "${name}" ${template}`);
		return {
			url: withDatabase(connectionString, name),
			async drop() {
				try {
					await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
				} catch {
					// A pooled connection can outlive the pool's `end()` for a
					// moment. Ending it here first would surface Postgres's
					// "terminating connection" as an unhandled error in that
					// pool, so this happens only when the drop needs it.
					await terminate(name);
					await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
				}
			},
		};
	}

	return {
		async createTemplate(): Promise<void> {
			// A template must have no other session open while it is copied.
			await terminate(baseName);
			await admin.query(`DROP DATABASE IF EXISTS ${TEMPLATE}`);
			await admin.query(`CREATE DATABASE ${TEMPLATE} TEMPLATE "${baseName}"`);
		},

		/** A copy of the migrated template. */
		clone(): Promise<TTestDb> {
			return create(`TEMPLATE ${TEMPLATE}`);
		},

		/** An empty database, with no migration applied. */
		createEmpty(): Promise<TTestDb> {
			return create("TEMPLATE template0");
		},

		async close(): Promise<void> {
			await admin.end();
		},
	};
}
