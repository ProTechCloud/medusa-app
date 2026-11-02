import { httpInstrumentationMiddleware } from "@hono/otel";
import type { MiddlewareHandler } from "hono";
import { HEALTH_PATH } from "./health-path";

/**
 * The request's URL with every query value replaced by `REDACTED`. The names
 * stay, so a trace still shows which parameters were sent; a value could be a
 * token or a person.
 */
export function redactQuery(url: string): string {
	const parsed = new URL(url);
	if (!parsed.search) return url;
	parsed.search = [...parsed.searchParams.keys()]
		.map((name) => `${encodeURIComponent(name)}=REDACTED`)
		.join("&");
	return parsed.toString();
}

const tracing = httpInstrumentationMiddleware({
	getUrlFull: (context) => redactQuery(context.req.url),
});

/**
 * One server span per request, continuing the caller's trace when it sent a
 * `traceparent`, with every span and log line inside it. The health probe
 * gets none: it arrives every few seconds and would bury the traces worth
 * reading.
 */
export const requestTracing: MiddlewareHandler = (context, next) =>
	context.req.path === HEALTH_PATH ? next() : tracing(context, next);
