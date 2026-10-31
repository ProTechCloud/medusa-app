import { Hono } from "hono";
import { getConfig } from "@/config";
import { logger } from "@/logger";
import { stopOnSignal } from "@/shared/shutdown";
import { initUseCaseContext } from "@/use-cases";
import { buildHttp } from "./http";
import { HEALTH_PATH } from "./http/lib/health-path";
import { requestCorrelation } from "./http/lib/request-correlation";
import { requestErrors } from "./http/lib/request-errors";
import { requestIdentity } from "./http/lib/request-identity";
import { requestLogger } from "./http/lib/request-logger";
import { requestTracing } from "./http/lib/request-tracing";

/**
 * The whole HTTP app: tracing, the caller's PostHog identity, the correlation
 * ID and logging, in that order, so each line and error a request produces
 * carries all three; then the routes, the health check, the JSON 404 and the
 * 500.
 */
export function buildApp(): Hono {
	const app = new Hono();

	app.use("*", requestTracing);
	app.use("*", requestIdentity);
	app.use("*", requestCorrelation);
	app.use("*", requestLogger);

	/**
	 * Liveness. Free of dependencies, so it stays truthful when anything
	 * downstream is degraded: it says only that the process answers.
	 */
	app.get(HEALTH_PATH, (context) =>
		context.json({ status: "ok", uptime: process.uptime() }),
	);

	app.route("/", buildHttp());

	app.notFound((context) =>
		context.json({ error: "not_found", path: context.req.path }, 404),
	);
	app.onError(requestErrors);

	return app;
}

async function start(): Promise<void> {
	// Every client the use cases need is built here, before the port opens.
	const { config } = await initUseCaseContext(async () => ({
		config: getConfig(),
		logger,
	}));

	const server = Bun.serve({
		hostname: "0.0.0.0",
		port: config.port,
		fetch: buildApp().fetch,
	});
	// The service and its version are on every line already.
	logger.info(
		{ commit: config.commit, port: server.port },
		`${config.service} listening`,
	);

	stopOnSignal(server);
}

// Serve only when run, not when a test imports `buildApp`.
if (import.meta.main) {
	try {
		await start();
	} catch (error) {
		// A bad environment is the usual cause; its message lists every variable.
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
