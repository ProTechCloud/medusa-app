import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "#src/schema/index.ts";

// node-postgres' pool-sizing guidance is to keep `max` at its default of 10
// until contention is measured. The other two settings are about connection
// hygiene: `keepAlive` stops the kernel from dropping idle sockets, and a
// longer idle timeout keeps warm connections through quiet periods.
// https://node-postgres.com/guides/pool-sizing
const POOL_MAX = 10;
const POOL_IDLE_TIMEOUT_MS = 60_000;

/**
 * A Drizzle client over a node-postgres pool. `onIdleError` hears an idle
 * connection fail, such as at a Postgres restart: the pool drops that
 * connection and opens another on the next query, but an `error` event with
 * no listener would throw and stop the process.
 */
export function createDb(
	connectionString: string,
	onIdleError: (error: Error) => void,
) {
	const pool = new pg.Pool({
		connectionString,
		max: POOL_MAX,
		idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
		keepAlive: true,
	});
	pool.on("error", onIdleError);
	return drizzle(pool, { schema });
}

export type TDb = ReturnType<typeof createDb>;
