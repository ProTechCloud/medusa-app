import { randomUUID } from "node:crypto";
import { rateLimit, sql } from "@medusa/db";
import { DateTime, Duration } from "luxon";
import { tooManyRequests } from "@/shared/domain-errors";
import type { TUseCaseContext } from "@/use-cases";
import { clientIp } from "./client-ip";

export const RATE_LIMIT_WINDOW = Duration.fromObject({ minutes: 15 });
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
	// `rate_limit` keeps times as epoch milliseconds, the column Better Auth's
	// schema gives it; they are converted here, at the query.
	const now = DateTime.utc();
	const nowMs = now.toMillis();
	const windowStart = now.minus(RATE_LIMIT_WINDOW).toMillis();
	const expired = sql`${rateLimit.lastRequest} < ${windowStart}`;

	const [row] = await ctx.db
		.insert(rateLimit)
		.values({ id: randomUUID(), key, count: 1, lastRequest: nowMs })
		.onConflictDoUpdate({
			target: rateLimit.key,
			set: {
				count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
				lastRequest: sql`CASE WHEN ${expired} THEN ${nowMs} ELSE ${rateLimit.lastRequest} END`,
			},
		})
		.returning({ count: rateLimit.count, opened: rateLimit.lastRequest });

	if (row && row.count > max) {
		const retryAfter = DateTime.fromMillis(row.opened)
			.plus(RATE_LIMIT_WINDOW)
			.diff(now);
		throw tooManyRequests(Math.max(1, Math.ceil(retryAfter.as("seconds"))));
	}
}

/**
 * The limits on every request that names an address: 50 per client address
 * and 10 per email address in 15 minutes. The client is counted first, so a
 * client past its limit leaves no row for each new address it sends. A
 * request with no client address, such as one to localhost, is counted per
 * email address only.
 */
export async function limitRequest(
	ctx: TUseCaseContext,
	{ email, headers }: { email: string; headers: Headers },
): Promise<void> {
	const ip = clientIp(headers, ctx.config.trustedProxies);
	if (ip) await consume(ctx, `ip:${ip}`, MAX_PER_IP);
	await consume(ctx, `address:${email}`, MAX_PER_ADDRESS);
}
