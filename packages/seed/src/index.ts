import { createDb, databaseUrl } from "@medusa/db";
import { z } from "zod";
import { createAuth } from "./lib/create-auth";
import { seedUsers } from "./lib/seed-users";
import { SEED_PASSWORD } from "./lib/users";

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

const db = createDb(databaseUrl(env), (error) => console.error(error));
const auth = createAuth(db, {
	secret: env.BETTER_AUTH_SECRET,
	url: env.BETTER_AUTH_URL,
});

try {
	console.log("Seeding the local database...");
	const { internalAdapter } = await auth.$context;
	await seedUsers(
		{
			findUserByEmail: (email) => internalAdapter.findUserByEmail(email),
			signUp: (body) => auth.api.signUpEmail({ body }),
		},
		console.log,
	);
	console.log(`Seeded. Every user's password is ${SEED_PASSWORD}.`);
} catch (error) {
	console.error("Seed failed:", error);
	process.exitCode = 1;
} finally {
	await db.$client.end();
}
