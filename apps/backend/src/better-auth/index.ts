import { account, session, type TDb, user, verification } from "@medusa/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import type { TConfig } from "@/config";
import { createSessionCache, type ISessionCache } from "./lib/session-cache";

export { withAuthErrors } from "./lib/errors";

/**
 * The longest password Better Auth takes, its own default, set here so the
 * resolvers cap every password field at the same length before hashing.
 */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * The Better Auth instance the use cases reach as `ctx.auth`, and the cache
 * in front of its session lookups. Use cases call `auth.api.*` directly; its
 * HTTP routes are never mounted, so its own rate limiter, which only guards
 * them, is off, and the limits live in the use cases.
 */
export function createAuth(db: TDb, config: TConfig) {
	// The cache and the instance need each other: the cache wraps
	// `auth.api.getSession`, and the sign-out hook, set when the instance is
	// built, evicts from the cache. The holder breaks the cycle; no hook can
	// run before it is filled, since hooks run only inside a call.
	const cacheRef: { current?: ISessionCache<unknown> } = {};

	const auth = betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: { user, session, account, verification },
		}),
		baseURL: config.auth.url,
		secret: config.auth.secret,
		rateLimit: { enabled: false },
		emailAndPassword: {
			enabled: true,
			maxPasswordLength: MAX_PASSWORD_LENGTH,
			// A reset recovers from a suspected stolen password, so no session
			// opened with the old one survives it.
			revokeSessionsOnPasswordReset: true,
		},
		user: {
			additionalFields: {
				// Never from a sign-up's input: a client cannot pick its role.
				role: {
					type: "string",
					defaultValue: "application_user",
					input: false,
				},
			},
		},
		databaseHooks: {
			session: {
				delete: {
					after: async (deleted) => {
						cacheRef.current?.invalidateByToken(deleted.token);
					},
				},
			},
		},
		plugins: [bearer()],
	});

	const sessionCache = createSessionCache((args) => auth.api.getSession(args));
	cacheRef.current = sessionCache;

	return { auth, sessionCache };
}

export type TAuth = ReturnType<typeof createAuth>["auth"];
export type TSessionCache = ReturnType<typeof createAuth>["sessionCache"];
