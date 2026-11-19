import pg from "pg";

export type TAdminPool = pg.Pool;

/**
 * A plain node-postgres pool, for a test's work outside Drizzle: creating,
 * cloning and dropping databases, or reading a table before it has a
 * client. Only tests import it.
 */
export function createAdminPool(connectionString: string, max = 5): TAdminPool {
	return new pg.Pool({ connectionString, max });
}
