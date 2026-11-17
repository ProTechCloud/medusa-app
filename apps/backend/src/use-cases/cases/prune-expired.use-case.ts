import { rateLimit, verification } from "@medusa/db";
import { lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { defineUseCase } from "@/use-cases";
import { RATE_LIMIT_WINDOW } from "@/use-cases/lib/rate-limit";

/**
 * Deletes what can no longer count: `rate_limit` rows whose window has
 * ended, and expired codes in `verification`. Neither is read again, but
 * every new address or client leaves one, so without this both grow for
 * good.
 */
export const pruneExpiredUseCase = defineUseCase<
	void,
	{ rateLimits: number; codes: number }
>(async function pruneExpiredUseCase(ctx) {
	const now = DateTime.utc();
	const rateLimits = await ctx.db
		.delete(rateLimit)
		.where(lt(rateLimit.lastRequest, now.minus(RATE_LIMIT_WINDOW).toMillis()))
		.returning({ id: rateLimit.id });
	const codes = await ctx.db
		.delete(verification)
		// The column is a timestamp, which the driver takes as a Date.
		.where(lt(verification.expiresAt, now.toJSDate()))
		.returning({ id: verification.id });
	const pruned = { rateLimits: rateLimits.length, codes: codes.length };
	ctx.logger.info(pruned, "expired rows pruned");
	return pruned;
});
