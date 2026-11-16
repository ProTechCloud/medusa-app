import { typeDefs } from "@medusa/gql";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import type { ZodError } from "zod";
import { logger } from "@/logger";
import { DOMAIN_ERROR_NAMES } from "@/use-cases/lib/domain-errors";
import { createAuthResolvers } from "./auth/resolvers";
import { yogaLogger } from "./lib/yoga-logger";

/** What every resolver receives: the request's headers, for its session. */
// fallow-ignore-next-line unused-type -- the generated resolvers-types.ts reads it.
export type TGraphqlContext = { headers: Headers };

export const GRAPHQL_PATH = "/graphql";

/** The input's problems as one message, `field: problem; field: problem`. */
function formatIssues(error: ZodError): string {
	return error.issues
		.map((issue) =>
			issue.path.length > 0
				? `${issue.path.join(".")}: ${issue.message}`
				: issue.message,
		)
		.join("; ");
}

/**
 * What a client may read of an error. A resolver's input that fails its
 * schema, and a domain error from a use case, keep their message under a
 * code; anything else becomes Yoga's generic message, and its detail stays
 * in the use case's log line.
 */
export function maskError(error: unknown, message: string): Error {
	// Matched by shape, not `instanceof`: graphql and zod each ship a CommonJS
	// and an ES module build, and an error made by one is not an instance of
	// the other's class.
	const wrapped = error as { originalError?: unknown } | null;
	const original = wrapped?.originalError ?? error;

	if (original instanceof Error && original.name === "ZodError") {
		return new GraphQLError(formatIssues(original as ZodError), {
			extensions: { code: "BAD_USER_INPUT" },
		});
	}
	if (original instanceof Error) {
		switch (original.name) {
			case DOMAIN_ERROR_NAMES.BAD_INPUT:
				return new GraphQLError(original.message, {
					extensions: { code: "BAD_USER_INPUT" },
				});
			case DOMAIN_ERROR_NAMES.UNAUTHENTICATED:
				return new GraphQLError(original.message, {
					extensions: { code: "UNAUTHENTICATED" },
				});
			case DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS:
				return new GraphQLError(original.message, {
					extensions: {
						code: "TOO_MANY_REQUESTS",
						retryAfterSeconds: (original as { retryAfterSeconds?: number })
							.retryAfterSeconds,
					},
				});
		}
	}
	// GraphQL's own errors, such as a query the schema refuses, carry no
	// original error and are already safe to show.
	if (
		original === error &&
		error instanceof Error &&
		error.name === "GraphQLError"
	) {
		return error;
	}
	return new GraphQLError(message, {
		extensions: { code: "INTERNAL_SERVER_ERROR" },
	});
}

/** The GraphQL endpoint: the schema in @medusa/gql, and its resolvers. */
export function buildYoga() {
	return createYoga<TGraphqlContext>({
		graphqlEndpoint: GRAPHQL_PATH,
		schema: createSchema<TGraphqlContext>({
			typeDefs,
			resolvers: [createAuthResolvers()],
		}),
		context: ({ request }) => ({ headers: request.headers }),
		maskedErrors: { maskError },
		logging: yogaLogger(logger),
	});
}
