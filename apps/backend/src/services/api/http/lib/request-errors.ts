import type { ErrorHandler } from "hono";
import { logger } from "@/logger";

/**
 * The last stop for an error no route handled: log it once, with the request
 * it broke, and answer a 500 in the same shape as the 404. The body names
 * the kind of error only, so no stack or message reaches the caller.
 */
export const requestErrors: ErrorHandler = (error, context) => {
	logger.error(
		{ err: error, method: context.req.method, path: context.req.path },
		"request failed",
	);
	return context.json({ error: "internal_error" }, 500);
};
