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
	const current = identity.getStore();
	posthog.captureException(error, current?.distinctId, {
		...correlationFields(),
		...(current?.sessionId ? { $session_id: current.sessionId } : {}),
	});
}

/** Send what is queued and stop the client. Resolves at once when there is none. */
export async function shutdownPostHog(): Promise<void> {
	if (client) await client.shutdown();
}
