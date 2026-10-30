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
		...overrides,
	};
}
