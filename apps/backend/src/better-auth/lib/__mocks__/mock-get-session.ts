import { faker } from "@faker-js/faker";

type Session = { session: { id: string }; user: { id: string } };

/** A session as `getSession` resolves it. */
export function generateSession(): Session {
	return {
		session: { id: faker.string.alphanumeric(32) },
		user: { id: faker.string.alphanumeric(32) },
	};
}

/**
 * A `getSession` that counts its calls and answers each one with the next
 * queued answer: a session, null, or one the test settles later.
 */
export function createFakeGetSession() {
	let calls = 0;
	const answers: Array<Promise<Session | null>> = [];

	return {
		getSession: async (_: { headers: Headers }) => {
			calls += 1;
			const next = answers.shift();
			if (!next) throw new Error("fake getSession: no answer queued");
			return next;
		},
		calls: () => calls,
		answer(...sessions: Array<Session | null>) {
			for (const session of sessions) answers.push(Promise.resolve(session));
		},
		/** Queues an answer the test settles by calling the returned function. */
		answerLater(): (session: Session | null) => void {
			let settle: (session: Session | null) => void = () => {};
			answers.push(
				new Promise((resolve) => {
					settle = resolve;
				}),
			);
			return settle;
		},
	};
}

export function bearerHeaders(token: string): Headers {
	return new Headers({ authorization: `Bearer ${token}` });
}
