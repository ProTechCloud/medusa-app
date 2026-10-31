import { AsyncLocalStorage } from "node:async_hooks";
import { PostHog } from "posthog-node";
import { correlationFields } from "@/opentelemetry/lib/log-correlation";
import { parsePostHogConfig, type TPostHogConfig } from "./lib/config";

export type TRequestIdentity = { distinctId?: string; sessionId?: string };

let config: TPostHogConfig | null | undefined;

/** The PostHog config, parsed from the process environment on the first call. Null without a token. */
export function getPostHogConfig(): TPostHogConfig | null {
	if (config === undefined) config = parsePostHogConfig(process.env);
	return config;
}

let client: PostHog | null | undefined;

/**
 * The PostHog client that reports errors, built on the first call. Null
 * without a token or with errors switched off. `enableExceptionAutocapture`
 * also reports an exception nothing caught.
 */
function getClient(): PostHog | null {
	if (client !== undefined) return client;
	const posthog = getPostHogConfig();
	client =
		posthog?.errors === true
			? new PostHog(posthog.token, {
					host: posthog.host,
					enableExceptionAutocapture: true,
					maxQueueSize: posthog.maxQueueSize,
					flushAt: posthog.flushAt,
					flushInterval: posthog.flushIntervalMs,
				})
			: null;
	return client;
}

let watchingRejections = false;

// How long a fatal rejection waits for PostHog before the process exits
// anyway: an unreachable PostHog must not keep a broken process serving.
const REPORT_BEFORE_EXIT_MS = 3000;

/**
 * Build the error client now, before the server serves: its exception
 * autocapture watches for what nothing catches only from the moment it
 * exists. Does nothing without a token or with errors switched off.
 *
 * It also reports an unhandled rejection. posthog-node expects Node's
 * default, which turns one into an `uncaughtException`; Bun does not, and
 * exits without a word to either listener. Once a listener is added the
 * process would no longer exit, so this one reports the rejection, waits for
 * PostHog to take it, for `REPORT_BEFORE_EXIT_MS` at most, and then exits
 * with 1, as Bun would have.
 */
export function initPostHog(): void {
	const posthog = getClient();
	if (!posthog || watchingRejections) return;
	watchingRejections = true;
	process.on("unhandledRejection", (reason) => {
		void reportAndExit(posthog, reason);
	});
}

async function reportAndExit(posthog: PostHog, reason: unknown): Promise<void> {
	try {
		await Promise.race([
			posthog.captureExceptionImmediate(
				reason,
				identity.getStore()?.distinctId,
				errorProperties(),
			),
			new Promise((resolve) => setTimeout(resolve, REPORT_BEFORE_EXIT_MS)),
		]);
	} finally {
		process.exit(1);
	}
}

const identity = new AsyncLocalStorage<TRequestIdentity>();

/**
 * Run `fn` as the app's PostHog user and session that sent the request, so
 * its logs and errors link to the session replay. No user is identified yet:
 * the IDs are the app's anonymous ones.
 */
export function withRequestIdentity<TResult>(
	requestIdentity: TRequestIdentity,
	fn: () => TResult,
): TResult {
	return identity.run(requestIdentity, fn);
}

/** The request's PostHog IDs as log fields. Empty outside a request or when the app sent none. */
export function requestIdentityLogFields(): {
	posthogDistinctId?: string;
	posthogSessionId?: string;
} {
	const current = identity.getStore();
	const fields: { posthogDistinctId?: string; posthogSessionId?: string } = {};
	if (current?.distinctId) fields.posthogDistinctId = current.distinctId;
	if (current?.sessionId) fields.posthogSessionId = current.sessionId;
	return fields;
}

/**
 * Report an error to PostHog's error tracking, with the request's
 * correlation and trace IDs and its session, so the report links to the
 * trace and the replay. Does nothing without a client.
 */
export function captureError(error: unknown): void {
	const posthog = getClient();
	if (!posthog) return;
	posthog.captureException(
		error,
		identity.getStore()?.distinctId,
		errorProperties(),
	);
}

/** What ties a report to its request: the correlation and trace IDs, and the session. */
function errorProperties(): Record<string, string> {
	const sessionId = identity.getStore()?.sessionId;
	return {
		...correlationFields(),
		...(sessionId ? { $session_id: sessionId } : {}),
	};
}

/** Send what is queued and stop the client. Resolves at once when there is none. */
export async function shutdownPostHog(): Promise<void> {
	if (client) await client.shutdown();
}
