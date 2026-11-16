import { faker } from "@faker-js/faker";

/** A complete, valid environment for `buildConfig`, as the process would hold it. */
export function generateEnv(
	overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
	return {
		APP_ENV: faker.helpers.arrayElement(["local", "stg", "prd"]),
		PORT: String(faker.internet.port()),
		APP_VERSION: faker.system.semver(),
		APP_COMMIT: faker.git.commitSha(),
		DB_HOST: faker.internet.domainName(),
		DB_PORT: String(faker.internet.port()),
		DB_NAME: faker.lorem.word(),
		DB_USER: faker.internet.username(),
		DB_PASSWORD: faker.internet.password(),
		BETTER_AUTH_SECRET: faker.string.alphanumeric(48),
		BETTER_AUTH_URL: faker.internet.url(),
		PUBSUB_PROJECT_ID: faker.lorem.slug(),
		PUBSUB_EMAILS_TOPIC: faker.lorem.slug(),
		TRUSTED_PROXIES: String(faker.number.int({ min: 0, max: 3 })),
		MAILGUN_API_KEY: faker.string.alphanumeric(32),
		...overrides,
	};
}
