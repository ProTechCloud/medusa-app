import { faker } from "@faker-js/faker";
import type { TConfig } from "@/config";

export function generateConfig(overrides: Partial<TConfig> = {}): TConfig {
	return {
		service: faker.lorem.slug(),
		environment: faker.helpers.arrayElement(["local", "stg", "prd"] as const),
		port: faker.internet.port(),
		version: faker.system.semver(),
		commit: faker.git.commitSha(),
		db: {
			url: `postgresql://${faker.internet.username()}:${faker.internet.password()}@${faker.internet.domainName()}:${faker.internet.port()}/${faker.lorem.word()}`,
		},
		auth: {
			secret: faker.string.alphanumeric(48),
			url: faker.internet.url(),
		},
		pubsub: {
			projectId: faker.lorem.slug(),
			emailsTopic: faker.lorem.slug(),
		},
		trustedProxies: faker.number.int({ min: 0, max: 3 }),
		mailgun: { apiKey: faker.string.alphanumeric(32) },
		...overrides,
	};
}
