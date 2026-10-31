import { shutdownTelemetry } from "@/opentelemetry";
import { shutdownPostHog } from "@/posthog";

/**
 * Send the traces, log lines and errors still queued, before the process
 * exits. Both run to the end even when one fails, and a failure goes to
 * stderr as one JSON line: the logger itself may be what failed to flush.
 */
export async function flushTelemetry(): Promise<void> {
	const results = await Promise.allSettled([
		shutdownTelemetry(),
		shutdownPostHog(),
	]);
	for (const result of results) {
		if (result.status === "rejected") {
			process.stderr.write(
				`${JSON.stringify({
					time: new Date().toISOString(),
					level: "error",
					msg: "telemetry flush failed",
					error: String(result.reason),
				})}\n`,
			);
		}
	}
}
