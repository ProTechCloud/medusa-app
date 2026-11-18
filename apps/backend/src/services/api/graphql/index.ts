import { typeDefs } from "@medusa/gql";
import { GraphQLError, type ValidationContext } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import { logger } from "@/logger";
import { DOMAIN_ERROR_NAMES } from "@/shared/domain-errors";
import { createAuthResolvers } from "./auth";
import { yogaLogger } from "./lib/yoga-logger";

type TYogaLogging = NonNullable<Parameters<typeof createYoga>[0]["logging"]>;

/** What every resolver receives: the request's headers, for its session. */
// fallow-ignore-next-line unused-type -- the generated resolvers-types.ts reads it.
export type TGraphqlContext = { headers: Headers };

export const GRAPHQL_PATH = "/graphql";

/**
 * What a client may read of an error. A domain error, from a use case or
 * from a resolver's input parse, keeps its message under a code; anything
 * else, a ZodError from deeper down included, becomes Yoga's generic
 * message, and its detail stays in the use case's log line.
 */
export function maskError(error: unknown, message: string): Error {
	// Matched by shape, not `instanceof`: graphql ships a CommonJS and an ES
	// module build, and an error made by one is not an instance of the other's
	// class.
	const wrapped = error as { originalError?: unknown } | null;
	const original = wrapped?.originalError ?? error;

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

// Refuses `__schema` and `__type` queries: a deployed API does not hand its
// schema to whoever asks. Clients build from @medusa/gql instead. It reads
// only the field's name: graphql's own NoSchemaIntrospectionCustomRule checks
// types with `instanceof`, which fails across graphql's CommonJS and ES
// module builds, the copy Yoga validates with not being the one imported here.
const noIntrospection: Plugin = {
	onValidate({ addValidationRule }) {
		addValidationRule((context: ValidationContext) => ({
			Field(node: { name: { value: string } }) {
				if (node.name.value === "__schema" || node.name.value === "__type") {
					context.reportError(
						new GraphQLError("GraphQL introspection is not allowed.", {
							nodes: [node as never],
						}),
					);
				}
			},
		}));
	},
};

/**
 * The GraphQL endpoint: the schema in @medusa/gql, and its resolvers. Only
 * a local API (`local: true`) serves GraphiQL and answers introspection.
 */
export function buildYoga({ local = false }: { local?: boolean } = {}) {
	return createYoga<TGraphqlContext>({
		graphqlEndpoint: GRAPHQL_PATH,
		schema: createSchema<TGraphqlContext>({
			typeDefs,
			resolvers: [createAuthResolvers()],
		}),
		context: ({ request }) => ({ headers: request.headers }),
		maskedErrors: { maskError },
		// Yoga types `logging` as @graphql-hive/logger's `Logger` class, whose
		// `#private` field no object can have; `yogaLogger` has every method
		// Yoga calls on it.
		logging: yogaLogger(logger) as unknown as TYogaLogging,
		graphiql: local,
		plugins: local ? [] : [noIntrospection],
	});
}
