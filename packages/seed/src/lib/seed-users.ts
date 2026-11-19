import { SEED_PASSWORD, SEED_USERS } from "./users";

/** What the seed needs of Better Auth: a lookup by address and a sign-up. */
export type TSeedAuth = {
	findUserByEmail: (email: string) => Promise<unknown>;
	signUp: (user: {
		name: string;
		email: string;
		password: string;
	}) => Promise<unknown>;
};

/**
 * Signs each seed user up, as the API would. A user already there is left
 * as it is, so the seed runs again safely. `log` hears one line per user.
 */
export async function seedUsers(
	auth: TSeedAuth,
	log: (line: string) => void,
): Promise<void> {
	for (const { name, email } of SEED_USERS) {
		if (await auth.findUserByEmail(email)) {
			log(`  ${email}: already there`);
			continue;
		}
		await auth.signUp({ name, email, password: SEED_PASSWORD });
		log(`  ${email}: signed up`);
	}
}
