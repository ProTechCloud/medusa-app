import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildASTSchema, parse, validate } from "graphql";
import { typeDefs } from "#src/index.ts";

const operationsDir = resolve(import.meta.dirname, "../../operations");

const operations = readdirSync(operationsDir, { recursive: true })
	.map(String)
	.filter((file) => file.endsWith(".graphql"));

describe("typeDefs", () => {
	it("builds a valid schema", () => {
		expect(() => buildASTSchema(typeDefs)).not.toThrow();
	});

	it.each(operations)("accepts the operation %s", (file) => {
		const schema = buildASTSchema(typeDefs);
		const document = parse(readFileSync(resolve(operationsDir, file), "utf8"));

		expect(validate(schema, document)).toEqual([]);
	});
});
