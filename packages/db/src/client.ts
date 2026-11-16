import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/auth";

// node-postgres' pool-sizing guidance is to keep `max` at its default of 10
// until contention is measured. The other two settings are about connection
// hygiene: `keepAlive` stops the kernel from dropping idle sockets, and a
// longer idle timeout keeps warm connections through quiet periods.
// https://node-postgres.com/guides/pool-sizing
const POOL_MAX = 10;
const POOL_IDLE_TIMEOUT_MS = 60_000;

export function createDb(connectionString: string) {
	const pool = new pg.Pool({
		connectionString,
		max: POOL_MAX,
		idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
		keepAlive: true,
	});
	return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
