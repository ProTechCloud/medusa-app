import { logger } from "@/logger";
import { flushTelemetry } from "./flush-telemetry";

type TStoppable = { stop: (closeActiveConnections?: boolean) => unknown };

/**
 * Stop the server on SIGINT or SIGTERM, send the telemetry still queued, and
 * exit. Docker sends SIGTERM on `docker stop`, so a deploy lets in-flight
 * requests finish, and their traces and logs reach PostHog, instead of
 * cutting them.
 */
export function stopOnSignal(server: TStoppable): void {
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, async () => {
			logger.info({ signal }, "stopping");
			await server.stop();
			await flushTelemetry();
			process.exit(0);
		});
	}
}
