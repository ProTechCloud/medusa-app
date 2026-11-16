import { faker } from "@faker-js/faker";

/** What a person types to sign up: a new address, a name and a password. */
export function generateSignUp(
	overrides: Partial<{ email: string; name: string; password: string }> = {},
) {
	return {
		email: faker.internet.email().toLowerCase(),
		name: faker.person.fullName(),
		password: faker.internet.password({ length: 16 }),
		...overrides,
	};
}
