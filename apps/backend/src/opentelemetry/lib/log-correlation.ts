import { AsyncLocalStorage } from "node:async_hooks";
import { trace } from "@opentelemetry/api";

const correlation = new AsyncLocalStorage<string>();

/**
 * Run `fn` with `correlationId` as the request's ID when no trace is
 * recording; inside a trace, the trace ID takes its place.
 */
export function withCorrelationId<TResult>(
	correlationId: string,
	fn: () => TResult,
): TResult {
	return correlation.run(correlationId, fn);
}

export type TCorrelationFields = {
	correlation_id?: string;
	trace_id?: string;
	span_id?: string;
	trace_flags?: string;
};

/**
 * The fields that tie a log line or an error report to its request, under
 * OpenTelemetry's log-correlation names. Inside a trace, `correlation_id` is
 * the trace ID, so one ID finds the request in stdout, in PostHog's logs and
 * traces, and in an error report; outside one it is the request's own ID.
 * Empty outside a request.
 */
export function correlationFields(): TCorrelationFields {
	const span = trace.getActiveSpan()?.spanContext();
	if (span && trace.isSpanContextValid(span)) {
		return {
			correlation_id: span.traceId,
			trace_id: span.traceId,
			span_id: span.spanId,
			trace_flags: span.traceFlags.toString(16).padStart(2, "0"),
		};
	}
	const correlationId = correlation.getStore();
	return correlationId ? { correlation_id: correlationId } : {};
}
