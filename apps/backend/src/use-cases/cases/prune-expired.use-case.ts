import { lt, rateLimit, verification } from "@medusa/db";
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
	// node-postgres reports how many rows each delete removed, so none is
	// read back.
	const rateLimits = await ctx.db
		.delete(rateLimit)
		.where(lt(rateLimit.lastRequest, now.minus(RATE_LIMIT_WINDOW).toMillis()));
	const codes = await ctx.db
		.delete(verification)
		// The column is a timestamp, which the driver takes as a Date.
		.where(lt(verification.expiresAt, now.toJSDate()));
	const pruned = {
		rateLimits: rateLimits.rowCount ?? 0,
		codes: codes.rowCount ?? 0,
	};
	ctx.logger.info(pruned, "expired rows pruned");
	return pruned;
});
