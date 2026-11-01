import { AsyncLocalStorage } from "node:async_hooks";
import { trace } from "@opentelemetry/api";
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
 * without a token or with errors switched off.
 */
function getClient(): PostHog | null {
	if (client !== undefined) return client;
	const posthog = getPostHogConfig();
	client =
		posthog?.errors === true
			? new PostHog(posthog.token, {
					host: posthog.host,
					// Off: the process's crash handler, in shared/shutdown.ts,
					// reports with `captureErrorNow` and flushes before it exits,
					// which posthog-node's own handler does not.
					enableExceptionAutocapture: false,
					maxQueueSize: posthog.maxQueueSize,
					flushAt: posthog.flushAt,
					flushInterval: posthog.flushIntervalMs,
				})
			: null;
	return client;
}

/**
 * Build the error client now, before the server serves, so the first error
 * report does not wait on it. Does nothing without a token or with errors
 * switched off.
 */
export function initPostHog(): void {
	getClient();
}

const identity = new AsyncLocalStorage<TRequestIdentity>();

/**
 * The request's PostHog IDs under the names PostHog links on a span or a log
 * record: `posthogDistinctId` to the person, `sessionId` to the session
 * replay. Empty outside a request or when the app sent none.
 */
function identityAttributes(requestIdentity: TRequestIdentity | undefined): {
	posthogDistinctId?: string;
	sessionId?: string;
} {
	const fields: { posthogDistinctId?: string; sessionId?: string } = {};
	if (requestIdentity?.distinctId)
		fields.posthogDistinctId = requestIdentity.distinctId;
	if (requestIdentity?.sessionId) fields.sessionId = requestIdentity.sessionId;
	return fields;
}

/**
 * Run `fn` as the app's PostHog user and session that sent the request, and
 * mark the request's span with them, so its trace, its log lines and its
 * errors link to the person and the session replay. No user is identified
 * yet: the IDs are the app's anonymous ones.
 */
export function withRequestIdentity<TResult>(
	requestIdentity: TRequestIdentity,
	fn: () => TResult,
): TResult {
	trace.getActiveSpan()?.setAttributes(identityAttributes(requestIdentity));
	return identity.run(requestIdentity, fn);
}

/** The request's PostHog IDs as log fields, named as on the span. */
export function requestIdentityLogFields(): {
	posthogDistinctId?: string;
	sessionId?: string;
} {
	return identityAttributes(identity.getStore());
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

/**
 * Report an error that is about to end the process, and resolve once PostHog
 * has it, so the crash handler can exit after. Resolves at once without a
 * client.
 */
export async function captureErrorNow(error: unknown): Promise<void> {
	const posthog = getClient();
	if (!posthog) return;
	await posthog.captureExceptionImmediate(
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
