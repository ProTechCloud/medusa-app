import { faker } from "@faker-js/faker";
import type { TApiVersion } from "@/screens/home/hooks/use-api-version/lib/version-schema";

export function generateVersion(
	overrides: Partial<TApiVersion> = {},
): TApiVersion {
	return {
		service: faker.lorem.slug(),
		version: `stg-${faker.number.int({ min: 1, max: 999 })}`,
		commit: faker.git.commitSha(),
		environment: faker.helpers.arrayElement(["local", "stg", "prd"]),
		...overrides,
	};
}
