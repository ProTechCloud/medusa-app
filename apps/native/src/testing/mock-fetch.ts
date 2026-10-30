/**
 * What a mocked request answers: a status and a JSON body, or a thrown error.
 * `delayMs` holds the answer back on the (fake) clock, so a test can see
 * what the screen shows while it waits.
 */
type TAnswer = { status?: number; body?: unknown; delayMs?: number } | Error;

const answers = new Map<string, TAnswer>();
const requests = new Map<string, number>();

/**
 * A `fetch` that answers by path. A test says what each path answers with
 * `mockFetch.on`; a path it did not set rejects, so a forgotten answer
 * fails the test instead of passing on `undefined`. `src/testing/mocks.ts`
 * installs it as the global `fetch` and resets it before each test.
 */
export const mockFetch = {
	on(path: string, answer: TAnswer): void {
		answers.set(path, answer);
	},

	/** How many requests reached `path` in this test. */
	calls(path: string): number {
		return requests.get(path) ?? 0;
	},

	reset(): void {
		answers.clear();
		requests.clear();
	},

	fetch: async (input: RequestInfo | URL): Promise<Response> => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		requests.set(url.pathname, (requests.get(url.pathname) ?? 0) + 1);

		const answer = answers.get(url.pathname);
		if (!answer)
			throw new Error(`mockFetch: no answer set for ${url.pathname}`);
		if (answer instanceof Error) throw answer;
		if (answer.delayMs) {
			await new Promise((resolve) => setTimeout(resolve, answer.delayMs));
		}

		const status = answer.status ?? 200;
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => answer.body,
		} as Response;
	},
};
