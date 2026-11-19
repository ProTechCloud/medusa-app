import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import type { TConfig } from "@/config";
import { buildApp } from "@/services/api";
import { GRAPHQL_PATH } from "@/services/api/graphql";

export type TGraphqlResult<TData> = {
	data?: TData | null;
	errors?: Array<{
		message: string;
		extensions?: { code?: string; retryAfterSeconds?: number };
	}>;
};

/**
 * Sends an operation from @medusa/gql to the API's /graphql, as a client
 * does, with a bearer token and extra headers when given.
 */
export async function graphqlRequest<TData, TVariables>(
	document: TypedDocumentNode<TData, TVariables>,
	variables: TVariables,
	{
		token,
		headers = {},
	}: { token?: string; headers?: Record<string, string> } = {},
): Promise<TGraphqlResult<TData>> {
	const response = await buildApp().request(GRAPHQL_PATH, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...headers,
		},
		body: JSON.stringify({ query: print(document), variables }),
	});
	return (await response.json()) as TGraphqlResult<TData>;
}

/**
 * Sends a raw query string to /graphql in `environment`, for what a typed
 * document cannot ask: introspection, aliases past the cap, fragments.
 */
export async function graphqlQuery(
	environment: TConfig["environment"],
	query: string,
): Promise<TGraphqlResult<unknown>> {
	const response = await buildApp({ environment }).request(GRAPHQL_PATH, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ query }),
	});
	return (await response.json()) as TGraphqlResult<unknown>;
}
