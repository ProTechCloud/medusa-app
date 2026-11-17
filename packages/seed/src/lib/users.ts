/**
 * The local users the seed signs up, all with `SEED_PASSWORD`. Sign in as
 * either on a local API; a test that needs a seeded user imports it from
 * here instead of repeating the address.
 */
export const SEED_USERS = [
	{ name: "Ana Local", email: "ana@example.com" },
	{ name: "Bruno Local", email: "bruno@example.com" },
] as const;

/** Local only: the seed refuses any environment but `local`. */
export const SEED_PASSWORD = "medusa-local-password";
