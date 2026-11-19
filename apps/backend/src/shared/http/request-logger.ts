import type { MiddlewareHandler } from "hono";
import type { Logger } from "pino";
import { logger } from "@/logger";
import { HEALTH_PATH } from "./health-path";

/**
 * One line per request, after the response: method, path, status and how
 * long it took. A 5xx is logged as `error` and a 4xx as `warn`, so the
 * requests that went wrong are the ones a level filter keeps.
 * The health probe is not logged: it arrives every few seconds and would bury
 * the requests worth reading, and its result already shows in the VM's unit
 * and in Docker's health status.
 */
export function createRequestLogger(log: Logger): MiddlewareHandler {
	return async (context, next) => {
		if (context.req.path === HEALTH_PATH) return next();

		const started = performance.now();
		await next();

		const status = context.res.status;
		const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
		log[level](
			{
				method: context.req.method,
				path: context.req.path,
				status,
				durationMs: Math.round(performance.now() - started),
			},
			"request",
		);
	};
}

export const requestLogger = createRequestLogger(logger);
