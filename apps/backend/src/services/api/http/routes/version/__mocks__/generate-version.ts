import { faker } from "@faker-js/faker";
import type { TVersion } from "@/use-cases/cases/load-version.use-case";

export function generateVersion(overrides: Partial<TVersion> = {}): TVersion {
	return {
		service: faker.lorem.slug(),
		version: faker.system.semver(),
		commit: faker.git.commitSha(),
		environment: faker.helpers.arrayElement(["local", "stg", "prd"]),
		...overrides,
	};
}
