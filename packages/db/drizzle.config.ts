import { defineConfig } from "drizzle-kit";

// drizzle-kit runs on your machine only, to write a migration from the
// schema: `yarn workspace @medusa/db db:generate`. The defaults match
// apps/backend/.env.local.example; generating needs no database.
const host = process.env.DB_HOST ?? "localhost";
const port = process.env.DB_PORT ?? "5432";
const name = process.env.DB_NAME ?? "medusa";
const user = process.env.DB_USER ?? "medusa";
const password = process.env.DB_PASSWORD ?? "medusadev";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/*.ts",
	out: "./drizzle",
	dbCredentials: {
		url: `postgresql://${user}:${password}@${host}:${port}/${name}`,
	},
});
