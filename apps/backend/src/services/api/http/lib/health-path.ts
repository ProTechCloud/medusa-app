/**
 * The liveness path. The entry point answers it, the image's HEALTHCHECK and
 * the deploy script poll it, and the request logger turns it down to debug,
 * so a probe every few seconds does not drown the log.
 */
export const HEALTH_PATH = "/health";
