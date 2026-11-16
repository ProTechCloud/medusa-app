import { faker } from "@faker-js/faker";
import { createEnvelope } from "@medusa/events";
import type { TEmailType } from "..";

/** An envelope for an email event, with a random address and code. */
export function generateEmailEnvelope(type: TEmailType) {
	return createEnvelope(type, {
		email: faker.internet.email(),
		code: faker.string.numeric(6),
	});
}
