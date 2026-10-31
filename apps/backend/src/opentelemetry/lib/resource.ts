import {
	type Resource,
	resourceFromAttributes,
} from "@opentelemetry/resources";
import {
	ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { TConfig } from "@/config";

/**
 * Who sends every trace and log line: the service as the config names it, so
 * `/version`, the log line and the trace all say the same; the commit as its
 * version; and the environment, which is how PostHog tells stg from prd in
 * the one project they share.
 */
export function buildResource(
	config: Pick<TConfig, "service" | "commit" | "environment">,
): Resource {
	return resourceFromAttributes({
		[ATTR_SERVICE_NAME]: config.service,
		[ATTR_SERVICE_VERSION]: config.commit,
		[ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
	});
}
