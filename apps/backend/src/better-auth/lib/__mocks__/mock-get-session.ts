import type { TSession } from "./generate-session";

/**
 * A `getSession` that counts its calls and answers each one with the next
 * queued answer: a session, null, or one the test settles later.
 */
export function createFakeGetSession() {
	let calls = 0;
	const answers: Array<Promise<TSession | null>> = [];

	return {
		getSession: async (_: { headers: Headers }) => {
			calls += 1;
			const next = answers.shift();
			if (!next) throw new Error("fake getSession: no answer queued");
			return next;
		},
		calls: () => calls,
		answer(...sessions: Array<TSession | null>) {
			for (const session of sessions) answers.push(Promise.resolve(session));
		},
		/** Queues an answer the test settles by calling the returned function. */
		answerLater(): (session: TSession | null) => void {
			let settle: (session: TSession | null) => void = () => {};
			answers.push(
				new Promise((resolve) => {
					settle = resolve;
				}),
			);
			return settle;
		},
	};
}
