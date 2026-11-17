import { createDb } from "@medusa/db";
import { z } from "zod";
import { createAuth } from "./lib/create-auth";
import { SEED_PASSWORD, SEED_USERS } from "./lib/users";

// `yarn seed` reads apps/backend/.env.local, the file the API reads.
const env = z
	.object({
		APP_ENV: z.literal("local", "seeds only a local database"),
		DB_HOST: z.string().min(1),
		DB_PORT: z.coerce.number().int().default(5432),
		DB_NAME: z.string().min(1),
		DB_USER: z.string().min(1),
		DB_PASSWORD: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
	})
	.parse(process.env);

const db = createDb(
	`postgresql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
);
const auth = createAuth(db, {
	secret: env.BETTER_AUTH_SECRET,
	url: env.BETTER_AUTH_URL,
});

/**
 * Signs each seed user up through Better Auth, as the API would. A user
 * already there is left as it is, so the seed runs again safely.
 */
async function seed(): Promise<void> {
	const { internalAdapter } = await auth.$context;
	for (const { name, email } of SEED_USERS) {
		if (await internalAdapter.findUserByEmail(email)) {
			console.log(`  ${email}: already there`);
			continue;
		}
		await auth.api.signUpEmail({
			body: { name, email, password: SEED_PASSWORD },
		});
		console.log(`  ${email}: signed up`);
	}
}

try {
	console.log("Seeding the local database...");
	await seed();
	console.log(`Seeded. Every user's password is ${SEED_PASSWORD}.`);
} catch (error) {
	console.error("Seed failed:", error);
	process.exitCode = 1;
} finally {
	await db.$client.end();
}
