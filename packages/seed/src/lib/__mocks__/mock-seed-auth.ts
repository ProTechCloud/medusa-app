import type { TSeedAuth } from "#src/lib/seed-users.ts";

/** A `TSeedAuth` over an in-memory list, which records each sign-up. */
export function mockSeedAuth(): TSeedAuth & { signedUp: string[] } {
	const signedUp: string[] = [];
	return {
		signedUp,
		findUserByEmail: async (email) => signedUp.includes(email) || null,
		signUp: async ({ email }) => {
			signedUp.push(email);
		},
	};
}
