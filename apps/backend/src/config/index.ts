import { z } from "zod";
import { envVar, parseEnv, portSchema } from "@/shared/env";

const ENVIRONMENTS = ["local", "stg", "prd"] as const;

const schema = z.object({
	APP_ENV: z.enum(ENVIRONMENTS),
	PORT: portSchema.default(8080),
	// Baked into the image by the deploy; a local run has no build to name.
	APP_VERSION: envVar.default("dev"),
	APP_COMMIT: envVar.default("local"),
});

export type TConfig = {
	service: string;
	environment: (typeof ENVIRONMENTS)[number];
	port: number;
	version: string;
	commit: string;
};

/** Parse a config from an environment. `getConfig()` calls it once with the process's. */
export function buildConfig(env: Record<string, string | undefined>): TConfig {
	const parsed = parseEnv(schema, env);
	return {
		service: "medusa-backend",
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
