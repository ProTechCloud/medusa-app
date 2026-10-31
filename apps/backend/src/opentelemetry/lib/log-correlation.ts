import { AsyncLocalStorage } from "node:async_hooks";
import { trace } from "@opentelemetry/api";

const correlation = new AsyncLocalStorage<string>();

/** Run `fn` with `correlationId` attached to every log line and error it produces. */
export function withCorrelationId<TResult>(
	correlationId: string,
	fn: () => TResult,
): TResult {
	return correlation.run(correlationId, fn);
}

/**
 * The fields that tie a log line or an error to its request: the correlation
 * ID, and the trace and span it happened in when one is recording. Empty
 * outside a request.
 */
export function correlationFields(): {
	correlationId?: string;
	traceId?: string;
	spanId?: string;
} {
	const fields: { correlationId?: string; traceId?: string; spanId?: string } =
		{};
	const correlationId = correlation.getStore();
	if (correlationId) fields.correlationId = correlationId;
	const span = trace.getActiveSpan()?.spanContext();
	if (span && trace.isSpanContextValid(span)) {
		fields.traceId = span.traceId;
		fields.spanId = span.spanId;
	}
	return fields;
}
