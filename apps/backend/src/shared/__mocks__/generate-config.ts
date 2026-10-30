import { faker } from "@faker-js/faker";
import type { TConfig } from "@/config";

export function generateConfig(overrides: Partial<TConfig> = {}): TConfig {
	return {
		service: faker.lorem.slug(),
		environment: faker.helpers.arrayElement(["local", "stg", "prd"] as const),
		port: faker.internet.port(),
		version: faker.system.semver(),
		commit: faker.git.commitSha(),
		...overrides,
	};
}
