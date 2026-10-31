import type { NodeSDK } from "@opentelemetry/sdk-node";
import { getConfig } from "@/config";
import { getPostHogConfig } from "@/posthog";
import { enableDiagnostics } from "./lib/diagnostics";

// Loaded before the API by `preload` in bunfig.toml, so the SDK registers its
// providers before any module asks for a tracer or a logger.

let sdk: NodeSDK | null = null;

/**
 * Start the NodeSDK when there is somewhere to send to: a project token, and
 * traces or logs switched on. Otherwise nothing is loaded and the API runs as
 * before. The SDK and its exporters are imported only then, so a run without
 * PostHog never loads them.
 */
async function startTelemetry(): Promise<void> {
	const posthog = getPostHogConfig();
	if (!posthog || (!posthog.traces && !posthog.logs)) return;

	const [
		{ NodeSDK },
		{ buildSdkConfiguration },
		{ buildResource },
		{ createSampler, parseSamplerRatio },
		{ parseBatchConfig },
	] = await Promise.all([
		import("@opentelemetry/sdk-node"),
		import("./lib/sdk-configuration"),
		import("./lib/resource"),
		import("./lib/sampler"),
		import("./lib/batch-config"),
	]);

	sdk = new NodeSDK(
		buildSdkConfiguration({
			posthog,
			resource: buildResource(getConfig()),
			sampler: createSampler(parseSamplerRatio(process.env)),
			batch: parseBatchConfig(process.env),
		}),
	);
	// After the constructor, which installs a console logger of its own when
	// OTEL_LOG_LEVEL is set.
	enableDiagnostics(process.env);
	sdk.start();
}

/** Export what is still batched, then stop. Resolves at once when the SDK never started. */
export async function shutdownTelemetry(): Promise<void> {
	if (sdk) await sdk.shutdown();
}

await startTelemetry();
