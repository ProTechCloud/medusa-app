import { z } from "zod";
import { envVar, parseEnv, positiveIntSchema } from "@/shared/env";

const schema = z.object({
	POSTHOG_PROJECT_TOKEN: envVar.optional(),
	// Without a trailing slash, so the paths appended to it never start `//`.
	POSTHOG_HOST: z
		.url()
		.transform((host) => host.replace(/\/+$/, ""))
		.default("https://us.i.posthog.com"),
	// One switch per signal, each on unless turned off.
	POSTHOG_TRACES: z.stringbool().default(true),
	POSTHOG_LOGS: z.stringbool().default(true),
	POSTHOG_ERRORS: z.stringbool().default(true),
	// Unset leaves posthog-node's own default.
	POSTHOG_MAX_QUEUE_SIZE: positiveIntSchema.optional(),
	POSTHOG_FLUSH_AT: positiveIntSchema.optional(),
	POSTHOG_FLUSH_INTERVAL_MS: positiveIntSchema.optional(),
});

export type TPostHogConfig = {
	token: string;
	host: string;
	traces: boolean;
	logs: boolean;
	errors: boolean;
	maxQueueSize?: number;
	flushAt?: number;
	flushIntervalMs?: number;
};

/**
 * Where the API sends its traces, logs and errors, and which of them. Null
 * without a project token: then nothing is sent, and the API runs the same.
 * Every variable is still checked, so a bad value fails the boot even before
 * a token is set.
 */
export function parsePostHogConfig(
	env: Record<string, string | undefined>,
): TPostHogConfig | null {
	const parsed = parseEnv(schema, env);
	if (!parsed.POSTHOG_PROJECT_TOKEN) return null;
	return {
		token: parsed.POSTHOG_PROJECT_TOKEN,
		host: parsed.POSTHOG_HOST,
		traces: parsed.POSTHOG_TRACES,
		logs: parsed.POSTHOG_LOGS,
		errors: parsed.POSTHOG_ERRORS,
		maxQueueSize: parsed.POSTHOG_MAX_QUEUE_SIZE,
		flushAt: parsed.POSTHOG_FLUSH_AT,
		flushIntervalMs: parsed.POSTHOG_FLUSH_INTERVAL_MS,
	};
}
