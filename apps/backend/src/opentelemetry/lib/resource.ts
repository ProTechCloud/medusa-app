import {
	type Resource,
	resourceFromAttributes,
} from "@opentelemetry/resources";
import {
	ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { z } from "zod";
import { parseEnv } from "@/shared/env";

// An entry point lives at src/services/<name>/index.ts, and <name> is the
// service: src/services/api/index.ts runs `api`.
const ENTRY_POINT = /\/src\/services\/([a-z0-9-]+)\/index\.ts$/;

/** The file the process was started with: under Bun its entry point, else the script node ran. */
export function currentEntryPoint(): string {
	return typeof Bun === "undefined" ? (process.argv[1] ?? "") : Bun.main;
}

/** The folder of the entry point under `src/services/`, when it is one. */
export function serviceNameFromEntryPoint(
	entryPoint: string,
): string | undefined {
	return ENTRY_POINT.exec(entryPoint)?.[1];
}

// Read as they are, and never refused here: the preload and the logger run
// before the entry point, and a bad value must reach `start()`, whose config
// parse names it in one line. Unset stays unset.
const schema = z.object({
	OTEL_SERVICE_NAME: z.string().optional(),
	APP_ENV: z.string().optional(),
	APP_VERSION: z.string().optional(),
	APP_COMMIT: z.string().optional(),
});

export type TServiceIdentity = {
	service: string;
	environment: string;
	version: string;
	commit: string;
};

/**
 * Who this process is, straight from the environment: the service
 * (`OTEL_SERVICE_NAME`, else the entry point's folder), its environment, its
 * version and its commit. The same rule as the config's, so `/version`, the
 * log line and the trace all say the same.
 */
export function readServiceIdentity(
	env: Record<string, string | undefined>,
	entryPoint: string = currentEntryPoint(),
): TServiceIdentity {
	const parsed = parseEnv(schema, env);
	return {
		service:
			parsed.OTEL_SERVICE_NAME ??
			serviceNameFromEntryPoint(entryPoint) ??
			"unknown_service",
		environment: parsed.APP_ENV ?? "unknown",
		version: parsed.APP_VERSION ?? "dev",
		commit: parsed.APP_COMMIT ?? "local",
	};
}

/**
 * Who sends every trace and log line: the service, the commit as its
 * version, and the environment, which is how PostHog tells stg from prd in
 * the one project they share.
 */
export function buildResource(
	identity: Pick<TServiceIdentity, "service" | "commit" | "environment">,
): Resource {
	return resourceFromAttributes({
		[ATTR_SERVICE_NAME]: identity.service,
		[ATTR_SERVICE_VERSION]: identity.commit,
		[ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: identity.environment,
	});
}
