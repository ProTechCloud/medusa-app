import { faker } from "@faker-js/faker";

export function generateCliKeys(): {
	POSTHOG_CLI_PROJECT_ID: string;
	POSTHOG_CLI_API_KEY: string;
} {
	return {
		POSTHOG_CLI_PROJECT_ID: faker.string.numeric(6),
		POSTHOG_CLI_API_KEY: faker.string.alphanumeric(32),
	};
}
