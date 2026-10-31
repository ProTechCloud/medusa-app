import type { MiddlewareHandler } from "hono";
import { type TRequestIdentity, withRequestIdentity } from "@/posthog";

// The app's anonymous PostHog distinct ID: 1 to 200 characters, none of them
// a control character.
const DISTINCT_ID = /^[^\p{C}]{1,200}$/u;
// PostHog session IDs are UUIDv7.
const SESSION_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The PostHog IDs the app sent, from `X-POSTHOG-DISTINCT-ID` and
 * `X-POSTHOG-SESSION-ID`. A value of the wrong shape is dropped, not passed
 * on: these headers come from the caller and end up in every log line and
 * error of the request.
 */
export function readRequestIdentity(
	header: (name: string) => string | undefined,
): TRequestIdentity {
	const identity: TRequestIdentity = {};
	const distinctId = header("X-POSTHOG-DISTINCT-ID");
	if (distinctId && DISTINCT_ID.test(distinctId))
		identity.distinctId = distinctId;
	const sessionId = header("X-POSTHOG-SESSION-ID");
	if (sessionId && SESSION_ID.test(sessionId)) identity.sessionId = sessionId;
	return identity;
}

/** Run the request as the app's PostHog user and session, so its logs and errors link to the replay. */
export const requestIdentity: MiddlewareHandler = (context, next) =>
	withRequestIdentity(
		readRequestIdentity((name) => context.req.header(name)),
		next,
	);
