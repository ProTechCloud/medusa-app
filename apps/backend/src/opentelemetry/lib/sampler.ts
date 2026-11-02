import {
	ParentBasedSampler,
	type Sampler,
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { z } from "zod";
import { parseEnv } from "@/shared/env";

const schema = z.object({
	// The share of new traces kept, from 0 to 1: `1` in stg keeps every one,
	// `0.1` in prd a tenth.
	OTEL_TRACES_SAMPLER_ARG: z.coerce
		.number()
		.min(0, "must be between 0 and 1")
		.max(1, "must be between 0 and 1")
		.default(1),
});

/** The share of new traces kept, parsed from `OTEL_TRACES_SAMPLER_ARG`. */
export function parseSamplerRatio(
	env: Record<string, string | undefined>,
): number {
	return parseEnv(schema, env).OTEL_TRACES_SAMPLER_ARG;
}

/**
 * Keep a trace when its caller kept it, drop it when its caller dropped it,
 * and otherwise keep `ratio` of them, so a trace is never cut in half.
 */
export function createSampler(ratio: number): Sampler {
	return new ParentBasedSampler({
		root: new TraceIdRatioBasedSampler(ratio),
	});
}
