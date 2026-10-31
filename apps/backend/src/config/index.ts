import { z } from "zod";
import { envVar, parseEnv, portSchema } from "@/shared/env";

const ENVIRONMENTS = ["local", "stg", "prd"] as const;

const schema = z.object({
	APP_ENV: z.enum(ENVIRONMENTS),
	PORT: portSchema.default(8080),
	// Baked into the image by the deploy; a local run has no build to name.
	APP_VERSION: envVar.default("dev"),
	APP_COMMIT: envVar.default("local"),
	// Names the service when its entry point does not, or overrides it.
	OTEL_SERVICE_NAME: envVar.optional(),
});

// An entry point lives at src/services/<name>/index.ts, and <name> is the
// service: src/services/api/index.ts runs `api`.
const ENTRY_POINT = /\/src\/services\/([a-z0-9-]+)\/index\.ts$/;

/** The file the process was started with: under Bun its entry point, else the script node ran. */
function currentEntryPoint(): string {
	return typeof Bun === "undefined" ? (process.argv[1] ?? "") : Bun.main;
}

/**
 * The service's name, which `/version`, every log line and every trace carry:
 * `OTEL_SERVICE_NAME` when set, else the folder of the entry point under
 * `src/services/`.
 */
function serviceName(override: string | undefined, entryPoint: string): string {
	if (override) return override;
	const name = ENTRY_POINT.exec(entryPoint)?.[1];
	if (!name) {
		throw new Error(
			`Cannot name the service from ${entryPoint}: run src/services/<name>/index.ts or set OTEL_SERVICE_NAME.`,
		);
	}
	return name;
}

export type TConfig = {
	service: string;
	environment: (typeof ENVIRONMENTS)[number];
	port: number;
	version: string;
	commit: string;
};

/**
 * Parse a config from an environment and the entry point the process ran.
 * `getConfig()` calls it once with the process's.
 */
export function buildConfig(
	env: Record<string, string | undefined>,
	entryPoint: string = currentEntryPoint(),
): TConfig {
	const parsed = parseEnv(schema, env);
	return {
		service: serviceName(parsed.OTEL_SERVICE_NAME, entryPoint),
		environment: parsed.APP_ENV,
		port: parsed.PORT,
		version: parsed.APP_VERSION,
		commit: parsed.APP_COMMIT,
	};
}

let config: TConfig | null = null;

/**
 * The process's config, parsed on the first call and cached. The entry point
 * calls it before serving, so a missing or bad variable stops the boot
 * instead of the first request that needs it. This is the only module that
 * reads the process environment; under Bun, `process.env` is `Bun.env`.
 */
export function getConfig(): TConfig {
	if (!config) config = buildConfig(process.env);
	return config;
}

/** Tests only: replace the cached config, so `getConfig()` returns this one. */
export function setConfigForTests(fixture: TConfig): void {
	config = fixture;
}
