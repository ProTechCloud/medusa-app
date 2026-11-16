import type { TUseCaseContext } from "@/use-cases";

/**
 * Drops every session of a user from this instance's session cache, before a
 * call that deletes them in bulk. A bulk delete runs no per-session hook, so
 * without this a revoked token would still be accepted here until the
 * cache's TTL ran out.
 */
export async function evictSessions(
	ctx: TUseCaseContext,
	userId: string,
): Promise<void> {
	const { internalAdapter } = await ctx.auth.$context;
	for (const session of await internalAdapter.listSessions(userId)) {
		ctx.sessionCache.invalidateByToken(session.token);
	}
}
