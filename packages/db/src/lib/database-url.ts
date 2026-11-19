/**
 * A node-postgres connection string from the DB_* variables, with the user
 * and password escaped, so a password holding `@`, `:` or `/` still parses.
 * The backend's config, the seed and drizzle-kit all build it here.
 */
export function databaseUrl(env: {
	DB_HOST: string;
	DB_PORT: number | string;
	DB_NAME: string;
	DB_USER: string;
	DB_PASSWORD: string;
}): string {
	const user = encodeURIComponent(env.DB_USER);
	const password = encodeURIComponent(env.DB_PASSWORD);
	return `postgresql://${user}:${password}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
}
