import { faker } from "@faker-js/faker";

/** A complete PostHog environment, as the VM's app.env would hold it. */
export function generatePostHogEnv(
	overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
	return {
		POSTHOG_PROJECT_TOKEN: `phc_${faker.string.alphanumeric(40)}`,
		POSTHOG_HOST: faker.internet.url({ appendSlash: false }),
		POSTHOG_TRACES: String(faker.datatype.boolean()),
		POSTHOG_LOGS: String(faker.datatype.boolean()),
		POSTHOG_ERRORS: String(faker.datatype.boolean()),
		POSTHOG_MAX_QUEUE_SIZE: String(faker.number.int({ min: 1, max: 10_000 })),
		POSTHOG_FLUSH_AT: String(faker.number.int({ min: 1, max: 500 })),
		POSTHOG_FLUSH_INTERVAL_MS: String(
			faker.number.int({ min: 1, max: 60_000 }),
		),
		...overrides,
	};
}
