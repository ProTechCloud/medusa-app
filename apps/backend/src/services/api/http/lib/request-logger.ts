import type { MiddlewareHandler } from "hono";
import type { Logger } from "pino";
import { logger } from "@/logger";
import { HEALTH_PATH } from "./health-path";

/**
 * One line per request, after the response: method, path, status and latency.
 * The health probe is not logged: it arrives every few seconds and would bury
 * the requests worth reading, and its result already shows in the VM's unit
 * and in Docker's health status.
 */
export function createRequestLogger(log: Logger): MiddlewareHandler {
	return async (context, next) => {
		if (context.req.path === HEALTH_PATH) return next();

		const started = performance.now();
		await next();

		log.info(
			{
				method: context.req.method,
				path: context.req.path,
				status: context.res.status,
				latencyMs: Math.round(performance.now() - started),
			},
			"request",
		);
	};
}

export const requestLogger = createRequestLogger(logger);
