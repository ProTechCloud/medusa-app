import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

/** Applies every migration in `drizzle/` not yet applied, then disconnects. */
export async function runMigrations(connectionString: string): Promise<void> {
	const pool = new pg.Pool({ connectionString });
	try {
		await migrate(drizzle(pool), { migrationsFolder });
	} finally {
		await pool.end();
	}
}
