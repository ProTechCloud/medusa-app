import { randomUUID } from "node:crypto";
import { rateLimit } from "@medusa/db";
import { sql } from "drizzle-orm";
import type { TUseCaseContext } from "@/use-cases";
import { clientIp } from "./client-ip";
import { tooManyRequests } from "./domain-errors";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ADDRESS = 10;
const MAX_PER_IP = 50;

/**
 * Counts one request against `key`, and throws `tooManyRequests` once more
 * than `max` arrived since the window opened. A request after the window
 * opens a new one. One statement, so concurrent requests cannot both read
 * the old count; the row lives in Postgres, so every instance shares it.
 */
async function consume(
	ctx: TUseCaseContext,
	key: string,
	max: number,
): Promise<void> {
	const now = Date.now();
	const windowStart = now - WINDOW_MS;
	const expired = sql`${rateLimit.lastRequest} < ${windowStart}`;

	const [row] = await ctx.db
		.insert(rateLimit)
		.values({ id: randomUUID(), key, count: 1, lastRequest: now })
		.onConflictDoUpdate({
			target: rateLimit.key,
			set: {
				count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
				lastRequest: sql`CASE WHEN ${expired} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
			},
		})
		.returning({ count: rateLimit.count, opened: rateLimit.lastRequest });

	if (row && row.count > max) {
		const retryAfterMs = row.opened + WINDOW_MS - now;
		throw tooManyRequests(Math.max(1, Math.ceil(retryAfterMs / 1000)));
	}
}

/**
 * The limits on every request that names an address: 10 per address and 50
 * per client address in 15 minutes. A request with no client address, such
 * as one to localhost, is counted per address only.
 */
export async function limitRequest(
	ctx: TUseCaseContext,
	{ email, headers }: { email: string; headers: Headers },
): Promise<void> {
	await consume(ctx, `address:${email}`, MAX_PER_ADDRESS);
	const ip = clientIp(headers, ctx.config.trustedProxies);
	if (ip) await consume(ctx, `ip:${ip}`, MAX_PER_IP);
}
