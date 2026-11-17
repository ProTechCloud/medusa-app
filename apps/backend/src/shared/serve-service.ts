import type { Hono } from "hono";
import type { TConfig } from "@/config";
import { logger } from "@/logger";
import { initPostHog } from "@/posthog";
import { createServiceContext, initUseCaseContext } from "@/use-cases";
import { exitOnCrash, stopOnSignal } from "./shutdown";

/**
 * Boot a service and serve its app: every client the use cases need is
 * built before the port opens, then the error client, and from the first
 * request on an exception or a rejection nothing catches is reported,
 * flushed and fatal. `port` picks the service's port from the config.
 *
 * A bad environment is the usual failure; its message lists every variable.
 * A refused database connection is an AggregateError with no message of its
 * own, so it is printed whole, with the address it tried.
 */
export async function serveService(
	buildApp: (config: TConfig) => Hono,
	port: (config: TConfig) => number = (config) => config.port,
): Promise<void> {
	try {
		const { config } = await initUseCaseContext(createServiceContext);
		initPostHog();
		exitOnCrash();

		const server = Bun.serve({
			hostname: "0.0.0.0",
			port: port(config),
			fetch: buildApp(config).fetch,
		});
		// The service and its version are on every line already.
		logger.info(
			{ commit: config.commit, port: server.port },
			`${config.service} listening`,
		);

		stopOnSignal(server);
	} catch (error) {
		console.error(
			error instanceof Error && error.message ? error.message : error,
		);
		process.exit(1);
	}
}
