import { shutdownTelemetry } from "@/opentelemetry";
import { shutdownPostHog } from "@/posthog";

/**
 * How long the process waits for its telemetry before it exits anyway.
 * `docker stop` kills the container 10 s after SIGTERM, and an unreachable
 * PostHog would hold each exporter far longer than that.
 */
export const FLUSH_TIMEOUT_MS = 3000;

function writeError(msg: string, error?: unknown): void {
	process.stderr.write(
		`${JSON.stringify({
			time: new Date().toISOString(),
			level: "error",
			msg,
			...(error === undefined ? {} : { error: String(error) }),
		})}\n`,
	);
}

/**
 * Wait for `work`, for `FLUSH_TIMEOUT_MS` at most. Past that, the process
 * exits without it, and stderr says so in one JSON line.
 */
export async function withinFlushTimeout(
	work: Promise<unknown>,
): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<"timeout">((resolve) => {
		timer = setTimeout(() => resolve("timeout"), FLUSH_TIMEOUT_MS);
	});
	const outcome = await Promise.race([
		work.then(() => "done" as const),
		timedOut,
	]);
	clearTimeout(timer);
	if (outcome === "timeout") writeError("telemetry flush timed out");
}

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
			writeError("telemetry flush failed", result.reason);
		}
	}
}
