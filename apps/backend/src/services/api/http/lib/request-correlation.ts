import type { MiddlewareHandler } from "hono";
import { withCorrelationId } from "@/opentelemetry/lib/log-correlation";

/**
 * Tag every log line and error of the request with one ID: Cloudflare's
 * `cf-ray` when the request came through the tunnel, so a line can be
 * matched to Cloudflare's own logs, else a new UUID.
 */
export const requestCorrelation: MiddlewareHandler = (context, next) =>
	withCorrelationId(context.req.header("cf-ray") ?? crypto.randomUUID(), next);
