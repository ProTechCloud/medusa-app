import { z } from "zod";
import { parseEnv, positiveIntSchema } from "@/shared/env";

// The variables the OpenTelemetry spec names for the two batch processors.
// Unset leaves the SDK's own default; a bad value stops the boot instead of
// being ignored.
const schema = z.object({
	OTEL_BSP_MAX_QUEUE_SIZE: positiveIntSchema.optional(),
	OTEL_BSP_MAX_EXPORT_BATCH_SIZE: positiveIntSchema.optional(),
	OTEL_BSP_SCHEDULE_DELAY: positiveIntSchema.optional(),
	OTEL_BSP_EXPORT_TIMEOUT: positiveIntSchema.optional(),
	OTEL_BLRP_MAX_QUEUE_SIZE: positiveIntSchema.optional(),
	OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: positiveIntSchema.optional(),
	OTEL_BLRP_SCHEDULE_DELAY: positiveIntSchema.optional(),
	OTEL_BLRP_EXPORT_TIMEOUT: positiveIntSchema.optional(),
});

export type TBatchConfig = {
	maxQueueSize?: number;
	maxExportBatchSize?: number;
	scheduledDelayMillis?: number;
	exportTimeoutMillis?: number;
};

/** The span (`OTEL_BSP_*`) and log record (`OTEL_BLRP_*`) batch processors' settings. */
export function parseBatchConfig(env: Record<string, string | undefined>): {
	spans: TBatchConfig;
	logs: TBatchConfig;
} {
	const parsed = parseEnv(schema, env);
	return {
		spans: {
			maxQueueSize: parsed.OTEL_BSP_MAX_QUEUE_SIZE,
			maxExportBatchSize: parsed.OTEL_BSP_MAX_EXPORT_BATCH_SIZE,
			scheduledDelayMillis: parsed.OTEL_BSP_SCHEDULE_DELAY,
			exportTimeoutMillis: parsed.OTEL_BSP_EXPORT_TIMEOUT,
		},
		logs: {
			maxQueueSize: parsed.OTEL_BLRP_MAX_QUEUE_SIZE,
			maxExportBatchSize: parsed.OTEL_BLRP_MAX_EXPORT_BATCH_SIZE,
			scheduledDelayMillis: parsed.OTEL_BLRP_SCHEDULE_DELAY,
			exportTimeoutMillis: parsed.OTEL_BLRP_EXPORT_TIMEOUT,
		},
	};
}
