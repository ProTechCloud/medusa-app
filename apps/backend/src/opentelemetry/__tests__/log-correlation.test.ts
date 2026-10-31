import { faker } from "@faker-js/faker";
import { context, ROOT_CONTEXT, TraceFlags, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	correlationFields,
	withCorrelationId,
} from "@/opentelemetry/lib/log-correlation";

const manager = new AsyncLocalStorageContextManager();

function generateSpanContext() {
	return {
		traceId: faker.string.hexadecimal({
			length: 32,
			prefix: "",
			casing: "lower",
		}),
		spanId: faker.string.hexadecimal({
			length: 16,
			prefix: "",
			casing: "lower",
		}),
		traceFlags: TraceFlags.SAMPLED,
	};
}

describe("correlationFields", () => {
	beforeAll(() => {
		context.setGlobalContextManager(manager.enable());
	});

	afterAll(() => {
		context.disable();
	});

	it("is empty outside a request", () => {
		expect(correlationFields()).toEqual({});
	});

	it("carries the correlation ID through awaits inside withCorrelationId", async () => {
		const correlationId = faker.string.uuid();

		const fields = await withCorrelationId(correlationId, async () => {
			await Promise.resolve();
			return correlationFields();
		});

		expect(fields).toEqual({ correlationId });
	});

	it("adds the trace and span of the span that is recording", () => {
		const correlationId = faker.string.uuid();
		const span = generateSpanContext();

		const fields = withCorrelationId(correlationId, () =>
			context.with(trace.setSpanContext(ROOT_CONTEXT, span), correlationFields),
		);

		expect(fields).toEqual({
			correlationId,
			traceId: span.traceId,
			spanId: span.spanId,
		});
	});

	it("leaves out a span context that is not valid", () => {
		const fields = context.with(
			trace.setSpanContext(ROOT_CONTEXT, {
				...generateSpanContext(),
				traceId: "0".repeat(32),
			}),
			correlationFields,
		);

		expect(fields).toEqual({});
	});
});
