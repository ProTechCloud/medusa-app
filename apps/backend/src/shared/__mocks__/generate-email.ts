import { faker } from "@faker-js/faker";
import type { TRenderedEmail } from "@medusa/emails";

export function generateEmail(
	overrides: Partial<TRenderedEmail> = {},
): TRenderedEmail {
	return {
		to: faker.internet.email(),
		subject: faker.lorem.sentence(),
		html: `<p>${faker.lorem.sentence()}</p>`,
		...overrides,
	};
}
