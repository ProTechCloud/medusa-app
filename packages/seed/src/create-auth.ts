import { account, type Db, session, user, verification } from "@medusa/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Better Auth as the API builds it, with only what a sign-up reads: the
 * tables, the secret, email and password, and the role, which the database
 * defaults to `application_user`. Same library, same password hashing, so
 * the API signs these users in.
 */
export function createAuth(
	db: Db,
	{ secret, url }: { secret: string; url: string },
) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: { user, session, account, verification },
		}),
		baseURL: url,
		secret,
		rateLimit: { enabled: false },
		emailAndPassword: { enabled: true },
	});
}
