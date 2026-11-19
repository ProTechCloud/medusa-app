import type { TUseCaseContext } from "@/use-cases";

/**
 * Runs `revoke`, a call that deletes every session of a user in bulk, then
 * drops those sessions from this instance's session cache. A bulk delete runs
 * no per-session hook, so without this a revoked token would still be
 * accepted here until the cache's TTL ran out.
 *
 * The tokens are read before the delete, which leaves none to read, and
 * evicted after it: evicted before, a request in between would cache the
 * session again, still valid in the database, for the whole TTL.
 */
export async function revokeSessions<TResult>(
	ctx: TUseCaseContext,
	userId: string,
	revoke: () => Promise<TResult>,
): Promise<TResult> {
	const { internalAdapter } = await ctx.auth.$context;
	const sessions = await internalAdapter.listSessions(userId);
	const result = await revoke();
	for (const session of sessions) {
		ctx.sessionCache.invalidateByToken(session.token);
	}
	return result;
}
