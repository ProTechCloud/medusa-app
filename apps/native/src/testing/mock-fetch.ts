/**
 * What a mocked request answers: a status and a JSON body, or a thrown error.
 * `delayMs` holds the answer back on the (fake) clock, so a test can see
 * what the screen shows while it waits, or cancel it before it comes.
 */
type TAnswer = { status?: number; body?: unknown; delayMs?: number } | Error;

const answers = new Map<string, TAnswer>();
const requests = new Map<string, number>();
const cancelled = new Map<string, number>();

function count(counter: Map<string, number>, path: string): void {
	counter.set(path, (counter.get(path) ?? 0) + 1);
}

// Waits `delayMs` on the clock, or rejects with the signal's reason as soon
// as the request is cancelled, as a real `fetch` does.
function wait(delayMs: number, signal?: AbortSignal | null): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, delayMs);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}

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

	/** How many requests to `path` were cancelled before their answer came. */
	cancelled(path: string): number {
		return cancelled.get(path) ?? 0;
	},

	reset(): void {
		answers.clear();
		requests.clear();
		cancelled.clear();
	},

	fetch: async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		count(requests, url.pathname);

		const answer = answers.get(url.pathname);
		if (!answer)
			throw new Error(`mockFetch: no answer set for ${url.pathname}`);
		if (answer instanceof Error) throw answer;
		if (answer.delayMs) {
			try {
				await wait(answer.delayMs, init?.signal);
			} catch (reason) {
				count(cancelled, url.pathname);
				throw reason;
			}
		}

		const status = answer.status ?? 200;
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => answer.body,
		} as Response;
	},
};
