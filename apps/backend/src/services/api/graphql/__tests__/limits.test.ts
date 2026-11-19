import { describe, expect, it } from "vitest";
import { buildApp } from "@/services/api";
import {
	GRAPHQL_MAX_BODY_BYTES,
	GRAPHQL_PATH,
	MAX_ROOT_FIELDS,
} from "@/services/api/graphql";
import { graphqlQuery } from "@/testing/graphql-request";

/** A query that asks for `me` under `count` aliases. */
function aliasedMe(count: number): string {
	const fields = Array.from(
		{ length: count },
		(_, index) => `me${index}: me { id }`,
	);
	return `{ ${fields.join(" ")} }`;
}

describe("/graphql's cap on top-level fields", () => {
	it.each(["local", "stg", "prd"] as const)(
		"refuses one operation past the cap in %s",
		async (environment) => {
			const result = await graphqlQuery(
				environment,
				aliasedMe(MAX_ROOT_FIELDS + 1),
			);

			expect(result.data).toBeUndefined();
			expect(result.errors?.[0]?.message).toContain(
				`at most ${MAX_ROOT_FIELDS} top-level fields`,
			);
		},
	);

	it.each([
		[
			"an inline fragment",
			(fields: string) => `{ ... on Query { ${fields} } }`,
		],
		[
			"a named fragment",
			(fields: string) =>
				`query { ...Many } fragment Many on Query { ${fields} }`,
		],
	])("counts the fields inside %s", async (_, wrap) => {
		const fields = aliasedMe(MAX_ROOT_FIELDS + 1).slice(2, -2);

		const result = await graphqlQuery("prd", wrap(fields));

		expect(result.errors?.[0]?.message).toContain(
			`at most ${MAX_ROOT_FIELDS} top-level fields`,
		);
	});

	it("answers a body past GRAPHQL_MAX_BODY_BYTES with a 413 and payload_too_large", async () => {
		const response = await buildApp({ environment: "prd" }).request(
			GRAPHQL_PATH,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					query: `{ me { id } }${" ".repeat(GRAPHQL_MAX_BODY_BYTES)}`,
				}),
			},
		);

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: "payload_too_large" });
	});

	it("lets one operation at the cap through validation", async () => {
		const result = await graphqlQuery("prd", aliasedMe(MAX_ROOT_FIELDS));

		expect(JSON.stringify(result.errors ?? [])).not.toContain(
			"top-level fields",
		);
	});
});
