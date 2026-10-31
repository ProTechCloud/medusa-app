import { faker } from "@faker-js/faker";
import {
	context,
	ROOT_CONTEXT,
	SpanKind,
	TraceFlags,
	trace,
} from "@opentelemetry/api";
import { SamplingDecision } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";
import { createSampler, parseSamplerRatio } from "@/opentelemetry/lib/sampler";

function decide(ratio: number, parent?: { sampled: boolean }) {
	const parentContext = parent
		? trace.setSpanContext(ROOT_CONTEXT, {
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
				traceFlags: parent.sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
				isRemote: true,
			})
		: context.active();
	return createSampler(ratio).shouldSample(
		parentContext,
		faker.string.hexadecimal({ length: 32, prefix: "", casing: "lower" }),
		faker.lorem.word(),
		SpanKind.SERVER,
		{},
		[],
	).decision;
}

describe("parseSamplerRatio", () => {
	it("keeps every trace when OTEL_TRACES_SAMPLER_ARG is not set", () => {
		expect(parseSamplerRatio({})).toBe(1);
	});

	it("reads the share of traces to keep", () => {
		const ratio = faker.number.float({ min: 0, max: 1, fractionDigits: 2 });

		expect(parseSamplerRatio({ OTEL_TRACES_SAMPLER_ARG: String(ratio) })).toBe(
			ratio,
		);
	});

	it.each(["1.5", "-0.1", "half"])(
		"refuses %s, naming the variable",
		(value) => {
			expect(() =>
				parseSamplerRatio({ OTEL_TRACES_SAMPLER_ARG: value }),
			).toThrow("OTEL_TRACES_SAMPLER_ARG: ");
		},
	);
});

describe("createSampler", () => {
	it.each([
		{
			label: "keeps every new trace at 1",
			ratio: 1,
			expected: SamplingDecision.RECORD_AND_SAMPLED,
		},
		{
			label: "keeps no new trace at 0",
			ratio: 0,
			expected: SamplingDecision.NOT_RECORD,
		},
	])("$label", ({ ratio, expected }) => {
		expect(decide(ratio)).toBe(expected);
	});

	it.each([
		{
			label: "keeps a trace its caller kept, whatever the ratio",
			ratio: 0,
			sampled: true,
			expected: SamplingDecision.RECORD_AND_SAMPLED,
		},
		{
			label: "drops a trace its caller dropped, whatever the ratio",
			ratio: 1,
			sampled: false,
			expected: SamplingDecision.NOT_RECORD,
		},
	])("$label", ({ ratio, sampled, expected }) => {
		expect(decide(ratio, { sampled })).toBe(expected);
	});
});
