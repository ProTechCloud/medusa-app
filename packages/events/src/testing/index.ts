import { faker } from "@faker-js/faker";
import type { TEventData } from "../lib/catalog";

/** The data of a sign-up or password-reset code request. */
export function generateCodeRequest(
	overrides: Partial<TEventData<"signup.code_requested">> = {},
): TEventData<"signup.code_requested"> {
	return {
		email: faker.internet.email(),
		code: faker.string.numeric(6),
		...overrides,
	};
}
