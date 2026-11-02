/**
 * The liveness path. The entry point answers it, the image's HEALTHCHECK and
 * the deploy script poll it, and neither the request logger nor the request
 * tracing records it, so a probe every few seconds does not drown the log or
 * the traces.
 */
export const HEALTH_PATH = "/health";
