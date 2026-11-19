import { faker } from "@faker-js/faker";
import { createEnvelope, type TEventData } from "@medusa/events";
import { generateCodeRequest } from "@medusa/events/testing";
import type { TEmailType, TRenderedEmail } from "#src/index.ts";

/** An envelope for an email event, with a random address and code. */
export function generateEmailEnvelope(
	type: TEmailType,
	overrides: Partial<TEventData<TEmailType>> = {},
) {
	return createEnvelope(type, generateCodeRequest(overrides));
}

/** An email as `renderEmail` returns it, ready to send. */
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
