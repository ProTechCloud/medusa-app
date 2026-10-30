import { z } from "zod";

type TEnv = Record<string, string | undefined>;

/** A required variable: any non-empty string. Blank values are already unset by `parseEnv`. */
export const envVar = z.string().min(1);

/** A TCP port, from the string the environment holds. */
export const portSchema = z.coerce
	.number()
	.int("must be a whole number")
	.min(1, "must be between 1 and 65535")
	.max(65535, "must be between 1 and 65535");

function isBlank(value: string | undefined): boolean {
	return value === undefined || value.trim() === "";
}

/**
 * Parse environment variables against a zod object schema, or throw one
 * error that lists every problem, one `NAME: what is wrong` per line. Fixing
 * a deploy then takes one look at the log, not one restart per variable.
 *
 * A blank value counts as unset, so `PORT=` in a file behaves like a missing
 * `PORT` — it gets the default, or it is reported as not set. The message
 * never repeats a value, because some variables are secrets.
 */
export function parseEnv<TSchema extends z.ZodObject>(
	schema: TSchema,
	env: TEnv,
): z.infer<TSchema> {
	const cleaned: TEnv = {};
	for (const name of Object.keys(schema.shape)) {
		const value = env[name];
		cleaned[name] = isBlank(value) ? undefined : value;
	}

	const result = schema.safeParse(cleaned);
	if (result.success) return result.data;

	const problems = result.error.issues.map((issue) => {
		const name = String(issue.path[0] ?? "(env)");
		const reason = cleaned[name] === undefined ? "is not set" : issue.message;
		return `${name}: ${reason}`;
	});
	throw new Error(
		`Invalid environment:\n${problems.map((line) => `  ${line}`).join("\n")}`,
	);
}
