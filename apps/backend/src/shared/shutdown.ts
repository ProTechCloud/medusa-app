import { logger } from "@/logger";

type TStoppable = { stop: (closeActiveConnections?: boolean) => unknown };

/**
 * Stop the server on SIGINT or SIGTERM and exit. Docker sends SIGTERM on
 * `docker stop`, so a deploy lets in-flight requests finish instead of
 * cutting them.
 */
export function stopOnSignal(server: TStoppable): void {
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, async () => {
			logger.info({ signal }, "stopping");
			await server.stop();
			process.exit(0);
		});
	}
}
