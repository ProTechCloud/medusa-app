import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { envVar, parseEnv, portSchema } from "@/shared/env";

const schema = z.object({
	NAME: envVar,
	PORT: portSchema,
	LEVEL: z.enum(["low", "high"]).default("low"),
});

function validEnv(): Record<string, string | undefined> {
	return {
		NAME: faker.lorem.word(),
		PORT: String(faker.internet.port()),
		LEVEL: faker.helpers.arrayElement(["low", "high"]),
	};
}

describe("parseEnv", () => {
	it("a full set of variables parses into typed values", () => {
		const env = validEnv();

		const parsed = parseEnv(schema, env);

		expect(parsed).toEqual({
			NAME: env.NAME,
			PORT: Number(env.PORT),
			LEVEL: env.LEVEL,
		});
	});

	it.each([
		{ label: "a missing variable", value: undefined },
		{ label: "an empty variable", value: "" },
		{ label: "a variable of only spaces", value: "   " },
	])("$label is reported by name as not set", ({ value }) => {
		const env = { ...validEnv(), NAME: value };

		expect(() => parseEnv(schema, env)).toThrow("NAME: is not set");
	});

	it.each([
		{ label: "text", port: faker.lorem.word() },
		{ label: "zero", port: "0" },
		{ label: "above 65535", port: String(faker.number.int({ min: 65536 })) },
		{ label: "a fraction", port: "80.5" },
	])("a port that is $label is reported by name", ({ port }) => {
		const env = { ...validEnv(), PORT: port };

		expect(() => parseEnv(schema, env)).toThrow(/PORT: /);
	});

	it("a blank variable with a default takes the default", () => {
		const env = { ...validEnv(), LEVEL: " " };

		expect(parseEnv(schema, env).LEVEL).toBe("low");
	});

	it("every problem is reported in one error", () => {
		const env = { NAME: "", PORT: faker.lorem.word(), LEVEL: "middle" };

		expect(() => parseEnv(schema, env)).toThrow(
			expect.objectContaining({
				message: expect.stringMatching(
					/NAME: is not set[\s\S]*PORT: [\s\S]*LEVEL: /,
				),
			}),
		);
	});

	it("the error never repeats a value it was given", () => {
		const secret = faker.string.alphanumeric(24);
		const env = { ...validEnv(), PORT: secret };

		expect(() => parseEnv(schema, env)).toThrow(
			expect.objectContaining({ message: expect.not.stringContaining(secret) }),
		);
	});
});
