import { z } from "zod";
import {
	currentEntryPoint,
	serviceNameFromEntryPoint,
} from "@/opentelemetry/lib/resource";
import { envVar, parseEnv, portSchema } from "@/shared/env";

const ENVIRONMENTS = ["local", "stg", "prd"] as const;

const schema = z
	.object({
		APP_ENV: z.enum(ENVIRONMENTS),
		PORT: portSchema.default(8080),
		// Baked into the image by the deploy; a local run has no build to name.
		APP_VERSION: envVar.default("dev"),
		APP_COMMIT: envVar.default("local"),
		// Names the service when its entry point does not, or overrides it.
		OTEL_SERVICE_NAME: envVar.optional(),
		DB_HOST: envVar,
		DB_PORT: portSchema.default(5432),
		DB_NAME: envVar,
		DB_USER: envVar,
		DB_PASSWORD: envVar,
		// Signs Better Auth's tokens; its own minimum.
		BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
		BETTER_AUTH_URL: z.url("must be a URL"),
		// Unset on Cloud Run, where the client reads the project from the
		// service's identity; the local emulator needs it.
		PUBSUB_PROJECT_ID: envVar.optional(),
		PUBSUB_EMAILS_TOPIC: envVar,
		// Who may push to the worker: the audience of the OIDC token the push
		// subscription sends, and the service account it signs as. Both or
		// neither; without them only a local worker accepts a push.
		PUBSUB_PUSH_AUDIENCE: envVar.optional(),
		PUBSUB_PUSH_SERVICE_ACCOUNT: envVar.optional(),
		// How many proxies in front of the service append to X-Forwarded-For:
		// the client's address is the entry before theirs.
		TRUSTED_PROXIES: z.coerce
			.number()
			.int("must be a whole number")
			.min(0, "must be 0 or more")
			.default(1),
		// Without it no email is sent; only a local API accepts the code 111111.
		MAILGUN_API_KEY: envVar.optional(),
		// The domain the key sends from, and the From of every email; both
		// needed once the key is set.
		MAILGUN_DOMAIN: envVar.optional(),
		MAILGUN_FROM: envVar.optional(),
		// Mailgun's API for the domain's region: unset is the US one; an EU
		// domain needs https://api.eu.mailgun.net.
		MAILGUN_API_URL: z.url("must be a URL").optional(),
		// Locally the API holds PORT, so the worker listens here; on Cloud
		// Run each service has its own PORT and this stays unset.
		WORKER_PORT: portSchema.optional(),
		// The migrate process applies migrations only when this is `true`, so
		// running it by mistake changes nothing.
		SHOULD_RUN_MIGRATION: z
			.enum(["true", "false"], "must be true or false")
			.default("false"),
	})
	.superRefine((env, issues) => {
		if (env.APP_ENV === "prd" && !env.MAILGUN_API_KEY) {
			issues.addIssue({
				code: "custom",
				path: ["MAILGUN_API_KEY"],
				message: "must be set in prd",
			});
		}
		const pushVars = [
			"PUBSUB_PUSH_AUDIENCE",
			"PUBSUB_PUSH_SERVICE_ACCOUNT",
		] as const;
		if (pushVars.some((name) => env[name])) {
			for (const name of pushVars) {
				if (!env[name]) {
					issues.addIssue({
						code: "custom",
						path: [name],
						message: "must be set with the other PUBSUB_PUSH_ variable",
					});
				}
			}
		}
		if (!env.MAILGUN_API_KEY) return;
		for (const name of ["MAILGUN_DOMAIN", "MAILGUN_FROM"] as const) {
			if (!env[name]) {
				issues.addIssue({
					code: "custom",
					path: [name],
					message: "must be set with MAILGUN_API_KEY",
				});
			}
		}
	});

/**
 * The service's name, which `/version`, every log line and every trace carry:
 * `OTEL_SERVICE_NAME` when set, else the folder of the entry point under
 * `src/services/`, as `readServiceIdentity` reads it.
 */
function serviceName(override: string | undefined, entryPoint: string): string {
	const name = override ?? serviceNameFromEntryPoint(entryPoint);
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
	db: { url: string };
	auth: { secret: string; url: string };
	pubsub: {
		projectId?: string;
		emailsTopic: string;
		push?: { audience: string; serviceAccount: string };
	};
	trustedProxies: number;
	mailgun: { apiKey?: string; domain?: string; from?: string; apiUrl?: string };
	workerPort?: number;
	shouldRunMigration: boolean;
};

/** A node-postgres connection string, with the user and password escaped. */
function databaseUrl(env: {
	DB_HOST: string;
	DB_PORT: number;
	DB_NAME: string;
	DB_USER: string;
	DB_PASSWORD: string;
}): string {
	const user = encodeURIComponent(env.DB_USER);
	const password = encodeURIComponent(env.DB_PASSWORD);
	return `postgresql://${user}:${password}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
}

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
		db: { url: databaseUrl(parsed) },
		auth: { secret: parsed.BETTER_AUTH_SECRET, url: parsed.BETTER_AUTH_URL },
		pubsub: {
			projectId: parsed.PUBSUB_PROJECT_ID,
			emailsTopic: parsed.PUBSUB_EMAILS_TOPIC,
			push:
				parsed.PUBSUB_PUSH_AUDIENCE && parsed.PUBSUB_PUSH_SERVICE_ACCOUNT
					? {
							audience: parsed.PUBSUB_PUSH_AUDIENCE,
							serviceAccount: parsed.PUBSUB_PUSH_SERVICE_ACCOUNT,
						}
					: undefined,
		},
		trustedProxies: parsed.TRUSTED_PROXIES,
		mailgun: {
			apiKey: parsed.MAILGUN_API_KEY,
			domain: parsed.MAILGUN_DOMAIN,
			from: parsed.MAILGUN_FROM,
			apiUrl: parsed.MAILGUN_API_URL,
		},
		workerPort: parsed.WORKER_PORT,
		shouldRunMigration: parsed.SHOULD_RUN_MIGRATION === "true",
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
