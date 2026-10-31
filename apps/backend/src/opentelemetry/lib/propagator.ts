import { W3CTraceContextPropagator } from "@opentelemetry/core";

/**
 * W3C trace context only: `traceparent` and `tracestate`, the headers PostHog
 * and every OpenTelemetry client read. No baggage, no B3, so no header a
 * caller sends can put data into a span.
 */
export function createPropagator(): W3CTraceContextPropagator {
	return new W3CTraceContextPropagator();
}
