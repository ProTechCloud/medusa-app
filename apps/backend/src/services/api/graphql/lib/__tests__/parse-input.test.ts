import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseInput } from "@/services/api/graphql/lib/parse-input";

const schema = z.object({
	email: z.email("is not an email"),
	code: z.string().regex(/^\d{6}$/, "must be 6 digits"),
});

describe("parseInput", () => {
	it("returns the parsed input", () => {
		const input = {
			email: faker.internet.email(),
			code: faker.string.numeric(6),
		};

		expect(parseInput(schema, input)).toEqual(input);
	});

	it("throws a bad input naming every field that is wrong", () => {
		const parsing = () =>
			parseInput(schema, {
				email: faker.lorem.word(),
				code: faker.lorem.word(),
			});

		expect(parsing).toThrow(
			expect.objectContaining({
				name: "BadInputError",
				message: "email: is not an email; code: must be 6 digits",
			}),
		);
	});
});
