import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import type { Resource } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import type { NodeSDKConfiguration } from "@opentelemetry/sdk-node";
import {
	BatchSpanProcessor,
	type Sampler,
} from "@opentelemetry/sdk-trace-base";
import type { TPostHogConfig } from "@/posthog/lib/config";
import type { TBatchConfig } from "./batch-config";
import { createPropagator } from "./propagator";

/**
 * What the NodeSDK runs with: OTLP over protobuf to PostHog's `/i/v1/traces`
 * and `/i/v1/logs`, authorised by the project token as a Bearer header, each
 * signal only when it is switched on. No instrumentations — the request and
 * use-case spans are opened by hand — and no metrics.
 */
export function buildSdkConfiguration(options: {
	posthog: TPostHogConfig;
	resource: Resource;
	sampler: Sampler;
	batch: { spans: TBatchConfig; logs: TBatchConfig };
}): Partial<NodeSDKConfiguration> {
	const { posthog, resource, sampler, batch } = options;
	const headers = { Authorization: `Bearer ${posthog.token}` };

	return {
		resource,
		autoDetectResources: false,
		sampler,
		textMapPropagator: createPropagator(),
		instrumentations: [],
		// Empty, not left out: without it the SDK builds an OTLP metrics
		// exporter from the environment, aimed at localhost.
		metricReaders: [],
		spanProcessors: posthog.traces
			? [
					new BatchSpanProcessor(
						new OTLPTraceExporter({
							url: `${posthog.host}/i/v1/traces`,
							headers,
						}),
						batch.spans,
					),
				]
			: [],
		logRecordProcessors: posthog.logs
			? [
					new BatchLogRecordProcessor({
						exporter: new OTLPLogExporter({
							url: `${posthog.host}/i/v1/logs`,
							headers,
						}),
						...batch.logs,
					}),
				]
			: [],
	};
}
