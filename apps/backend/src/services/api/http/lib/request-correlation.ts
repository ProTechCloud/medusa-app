import type { MiddlewareHandler } from "hono";
import { withCorrelationId } from "@/opentelemetry/lib/log-correlation";

// Cloudflare's ray ID: 16 hex digits and the three-letter data centre.
const CF_RAY = /^[0-9a-f]{16}-[A-Z]{3}$/;

/**
 * Give the request an ID for when no trace is recording: Cloudflare's
 * `cf-ray` when the request came through the tunnel, so a line can be
 * matched to Cloudflare's own logs, else a new UUID. A `cf-ray` of any other
 * shape is the caller's, not Cloudflare's, and is dropped: it would land on
 * every line and report of the request.
 */
export const requestCorrelation: MiddlewareHandler = (context, next) => {
	const ray = context.req.header("cf-ray");
	return withCorrelationId(
		ray && CF_RAY.test(ray) ? ray : crypto.randomUUID(),
		next,
	);
};
