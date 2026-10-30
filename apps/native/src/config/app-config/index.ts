import Constants from "expo-constants";
import { z } from "zod";

const schema = z.object({
	appEnv: z.enum(["dev", "stg", "prd"]),
});

export type TAppConfig = z.infer<typeof schema>;

// The build's env variable behind each field of `extra`, so an error names
// what to fix in `.env.<APP_ENV>` rather than a field the reader never set.
const ENV_NAMES: Record<keyof TAppConfig, string> = {
	appEnv: "APP_ENV",
};

/**
 * Parse the `extra` that `app.config.ts` wrote into the build. Throws one
 * error listing every bad field by its env variable, never its value.
 */
export function parseAppConfig(extra: unknown): TAppConfig {
	const fields = (extra ?? {}) as Record<string, unknown>;
	const parsed = schema.safeParse(fields);
	if (parsed.success) return parsed.data;

	// Whether the field is there decides the wording; zod does not keep the input.
	const problems = parsed.error.issues.map((issue) => {
		const field = issue.path[0] as keyof TAppConfig;
		const what = fields[field] === undefined ? "is not set" : issue.message;
		return `  ${ENV_NAMES[field] ?? String(field)}: ${what}`;
	});
	throw new Error(`Invalid app config:\n${problems.join("\n")}`);
}

/**
 * The app's config, parsed once at launch. Nothing else reads `Constants`
 * or `process.env`.
 */
export const appConfig: TAppConfig = parseAppConfig(
	Constants.expoConfig?.extra,
);
