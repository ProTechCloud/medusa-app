import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";

/**
 * An in-process cache of `auth.api.getSession` results, keyed by the bearer
 * token's hash, so an authenticated request does not read the database every
 * time. Sign-out evicts its entry through Better Auth's
 * `session.delete.after` hook; another instance that served the token keeps
 * its copy until the TTL ends, which bounds how long a revoked session can
 * still be accepted there.
 *
 * The key is the token's SHA-256, so a heap dump or a debug log of the cache
 * never shows a usable token. Only sessions are cached, never a miss: caching
 * `null` would let anyone sending garbage tokens push real sessions out of
 * the LRU, and would pin a "no session" answer for a token that becomes
 * valid a moment later.
 *
 * https://better-auth.com/docs/concepts/session-management
 * https://isaacs.github.io/node-lru-cache/
 */

const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_MAX_ENTRIES = 5_000;

type GetSession<TSession> = (args: { headers: Headers }) => Promise<TSession>;

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/** The token of an `Authorization: Bearer <token>` header, or null. */
function bearerToken(headers: Headers): string | null {
	const authorization = headers.get("authorization");
	if (!authorization) return null;
	const space = authorization.indexOf(" ");
	if (space < 0) return null;
	if (authorization.slice(0, space).toLowerCase() !== "bearer") return null;
	const token = authorization.slice(space + 1).trim();
	return token.length > 0 ? token : null;
}

export interface ISessionCache<TSession> {
	/**
	 * The session for a request's headers: from the cache when a fresh entry
	 * exists, else from `getSession`. Concurrent misses for one token share a
	 * single lookup. Without a bearer token it asks `getSession` directly.
	 */
	get(headers: Headers): Promise<TSession>;
	/** Drops the entry for a token now, as sign-out does. */
	invalidateByToken(token: string): void;
}

export function createSessionCache<TSession>(
	getSession: GetSession<TSession>,
): ISessionCache<TSession> {
	const cache = new LRUCache<string, NonNullable<TSession> & object>({
		max: SESSION_CACHE_MAX_ENTRIES,
		ttl: SESSION_CACHE_TTL_MS,
	});
	const inflight = new Map<string, Promise<TSession>>();
	// Tokens invalidated while their lookup was still running. Without this,
	// a sign-out racing a lookup would lose: the lookup would resolve after
	// the eviction and put the revoked session back for the whole TTL. Only
	// keys with a lookup in flight are added, and its `finally` removes them.
	const invalidatedKeys = new Set<string>();

	async function get(headers: Headers): Promise<TSession> {
		const token = bearerToken(headers);
		if (!token) return getSession({ headers });

		const key = hashToken(token);
		const cached = cache.get(key);
		if (cached !== undefined) return cached;

		const existing = inflight.get(key);
		if (existing) return existing;

		const lookup = getSession({ headers })
			.then((session) => {
				// Single-threaded: nothing runs between this check and the set.
				if (
					session != null &&
					typeof session === "object" &&
					!invalidatedKeys.has(key)
				) {
					cache.set(key, session as NonNullable<TSession> & object);
				}
				return session;
			})
			.finally(() => {
				inflight.delete(key);
				invalidatedKeys.delete(key);
			});
		inflight.set(key, lookup);
		return lookup;
	}

	function invalidateByToken(token: string): void {
		const key = hashToken(token);
		cache.delete(key);
		if (inflight.has(key)) invalidatedKeys.add(key);
	}

	return { get, invalidateByToken };
}
