import type { MiddlewareHandler } from "hono";
import { logger } from "@/logger";
import { HEALTH_PATH } from "./health-path";

/** One line per request, after the response: method, path, status and latency. */
export const requestLogger: MiddlewareHandler = async (context, next) => {
	const started = performance.now();
	await next();

	const line = {
		method: context.req.method,
		path: context.req.path,
		status: context.res.status,
		latencyMs: Math.round(performance.now() - started),
	};
	if (context.req.path === HEALTH_PATH) logger.debug(line, "request");
	else logger.info(line, "request");
};
