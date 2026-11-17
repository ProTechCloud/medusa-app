import { describe, expect, it } from "vitest";
import { buildApp } from "@/services/api";
import { GRAPHQL_PATH } from "@/services/api/graphql";

const INTROSPECTION = "{ __schema { queryType { name } } }";

async function introspect(environment: "local" | "stg" | "prd") {
	const response = await buildApp({ environment }).request(GRAPHQL_PATH, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ query: INTROSPECTION }),
	});
	return (await response.json()) as {
		data?: unknown;
		errors?: Array<{ message: string }>;
	};
}

async function openGraphiql(environment: "local" | "stg" | "prd") {
	return await buildApp({ environment }).request(GRAPHQL_PATH, {
		headers: { accept: "text/html" },
	});
}

describe("/graphql on a deployed API", () => {
	it.each(["stg", "prd"] as const)(
		"refuses introspection in %s",
		async (environment) => {
			const result = await introspect(environment);

			expect(result.data).toBeUndefined();
			expect(result.errors?.[0]?.message).toContain("introspection");
		},
	);

	it.each(["stg", "prd"] as const)(
		"serves no GraphiQL page in %s",
		async (environment) => {
			const response = await openGraphiql(environment);

			expect(await response.text()).not.toContain("GraphiQL");
		},
	);
});

describe("/graphql on a local API", () => {
	it("answers introspection", async () => {
		const result = await introspect("local");

		expect(result).toEqual({
			data: { __schema: { queryType: { name: "Query" } } },
		});
	});

	it("serves GraphiQL", async () => {
		const response = await openGraphiql("local");

		expect(response.headers.get("content-type")).toContain("text/html");
		expect(await response.text()).toContain("GraphiQL");
	});
});
