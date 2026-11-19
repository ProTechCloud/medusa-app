import type { z } from "zod";
import { badInput } from "@/shared/domain-errors";

/** The input's problems as one message, `field: problem; field: problem`. */
function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) =>
			issue.path.length > 0
				? `${issue.path.join(".")}: ${issue.message}`
				: issue.message,
		)
		.join("; ");
}

/**
 * A resolver's input, parsed by its schema; a bad one throws `badInput` with
 * what is wrong. Only here does a ZodError become a client's error: one from
 * deeper down, such as a malformed row, stays internal and is masked.
 */
export function parseInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
): z.infer<TSchema> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw badInput(formatIssues(parsed.error));
	return parsed.data;
}
