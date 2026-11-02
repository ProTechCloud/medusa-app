import { logCrash, logger } from "@/logger";
import { captureErrorNow } from "@/posthog";
import { flushTelemetry, withinFlushTimeout } from "./flush-telemetry";

type TStoppable = { stop: (closeActiveConnections?: boolean) => unknown };

/**
 * Stop the server on SIGINT or SIGTERM, send the telemetry still queued, and
 * exit. Docker sends SIGTERM on `docker stop`, so a deploy lets in-flight
 * requests finish, and their traces and logs reach PostHog, instead of
 * cutting them. The flush is bounded, so the process exits before Docker
 * kills it.
 */
export function stopOnSignal(server: TStoppable): void {
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, async () => {
			logger.info({ signal }, "stopping");
			await server.stop();
			await withinFlushTimeout(flushTelemetry());
			process.exit(0);
		});
	}
}

/**
 * Own the end of a crash: an exception or a rejection nothing caught. Write
 * the fatal line, report it to PostHog, send the open spans and queued log
 * records, all within the flush timeout, then exit with 1.
 *
 * With a listener the process no longer exits by itself, so this one does.
 * Bun also needs the rejection listener: it does not turn an unhandled
 * rejection into an `uncaughtException`, as Node does.
 */
export function exitOnCrash(): void {
	process.on("uncaughtException", (error, origin) => {
		void crash(error, origin);
	});
	process.on("unhandledRejection", (reason) => {
		void crash(reason, "unhandledRejection");
	});
}

async function crash(error: unknown, origin: string): Promise<void> {
	try {
		logCrash(error, origin);
		// Together, so a report that stalls holds back nothing else in the time
		// there is. The flush goes first: once the report is in flight, the
		// PostHog client sends nothing else until it ends.
		await withinFlushTimeout(
			Promise.allSettled([flushTelemetry(), captureErrorNow(error)]),
		);
	} finally {
		process.exit(1);
	}
}
