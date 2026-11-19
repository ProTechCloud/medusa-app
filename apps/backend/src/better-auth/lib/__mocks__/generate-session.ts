import { faker } from "@faker-js/faker";

export type TSession = { session: { id: string }; user: { id: string } };

/** A session as `getSession` resolves it. */
export function generateSession(): TSession {
	return {
		session: { id: faker.string.alphanumeric(32) },
		user: { id: faker.string.alphanumeric(32) },
	};
}
