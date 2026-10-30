import { Hono } from "hono";
import { getConfig } from "@/config";
import { logger } from "@/logger";
import { stopOnSignal } from "@/shared/shutdown";
import { initUseCaseContext } from "@/use-cases";
import { buildHttp } from "./http";
import { HEALTH_PATH } from "./http/lib/health-path";
import { requestErrors } from "./http/lib/request-errors";
import { requestLogger } from "./http/lib/request-logger";

/** The whole HTTP app: logging, the routes, the health check, the JSON 404 and the 500. */
export function buildApp(): Hono {
	const app = new Hono();

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

function start(): void {
	const config = getConfig();
	initUseCaseContext({ config, logger });

	const server = Bun.serve({
		hostname: "0.0.0.0",
		port: config.port,
		fetch: buildApp().fetch,
	});
	logger.info(
		{ version: config.version, commit: config.commit, port: server.port },
		`${config.service} listening`,
	);

	stopOnSignal(server);
}

// Serve only when run, not when a test imports `buildApp`.
if (import.meta.main) {
	try {
		start();
	} catch (error) {
		// A bad environment is the usual cause; its message lists every variable.
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
