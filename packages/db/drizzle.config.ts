import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/lib/database-url";

// drizzle-kit runs on your machine only, to write a migration from the
// schema: `yarn workspace @medusa/db db:generate`. The defaults match
// apps/backend/.env.local.example; generating needs no database.

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl({
			DB_HOST: process.env.DB_HOST ?? "localhost",
			DB_PORT: process.env.DB_PORT ?? "5432",
			DB_NAME: process.env.DB_NAME ?? "medusa",
			DB_USER: process.env.DB_USER ?? "medusa",
			DB_PASSWORD: process.env.DB_PASSWORD ?? "medusadev",
		}),
	},
});
