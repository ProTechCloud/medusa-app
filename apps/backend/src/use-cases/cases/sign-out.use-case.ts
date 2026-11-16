import { defineUseCase } from "@/use-cases";
import { unauthenticated } from "@/use-cases/lib/domain-errors";

/**
 * Ends the session the request's bearer token opened. Better Auth's
 * sign-out hook evicts it from the session cache.
 */
export const signOutUseCase = defineUseCase<{ headers: Headers }, true>(
	async function signOutUseCase(ctx, { headers }) {
		if (!(await ctx.sessionCache.get(headers))) throw unauthenticated();
		await ctx.auth.api.signOut({ headers });
		return true;
	},
);
