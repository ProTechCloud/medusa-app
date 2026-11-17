import { Hono, type MiddlewareHandler } from "hono";
import { HEALTH_PATH } from "./health-path";
import { requestCorrelation } from "./request-correlation";
import { requestErrors } from "./request-errors";
import { requestLogger } from "./request-logger";
import { requestTracing } from "./request-tracing";

/**
 * What every service's HTTP app shares: tracing, the caller's identity when
 * the service reads one, the correlation ID and logging, in that order, so
 * each line and error a request produces carries all of them; then the
 * health check, the routes `mount` adds, the JSON 404 and the 500.
 */
export function buildServiceApp(
	mount: (app: Hono) => void,
	identity?: MiddlewareHandler,
): Hono {
	const app = new Hono();

	app.use("*", requestTracing);
	if (identity) app.use("*", identity);
	app.use("*", requestCorrelation);
	app.use("*", requestLogger);

	/**
	 * Liveness. Free of dependencies, so it stays truthful when anything
	 * downstream is degraded: it says only that the process answers.
	 */
	app.get(HEALTH_PATH, (context) =>
		context.json({ status: "ok", uptime: process.uptime() }),
	);

	mount(app);

	app.notFound((context) =>
		context.json({ error: "not_found", path: context.req.path }, 404),
	);
	app.onError(requestErrors);

	return app;
}
