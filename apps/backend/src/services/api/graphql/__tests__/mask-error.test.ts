import { faker } from "@faker-js/faker";
import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { maskError } from "@/services/api/graphql";
import {
	badInput,
	tooManyRequests,
	unauthenticated,
} from "@/shared/domain-errors";

const GENERIC = "Unexpected error.";

function thrownInResolver(error: Error): GraphQLError {
	return new GraphQLError(error.message, { originalError: error });
}

describe("maskError", () => {
	it.each([
		["a bad input", badInput(faker.lorem.sentence()), "BAD_USER_INPUT"],
		["a missing session", unauthenticated(), "UNAUTHENTICATED"],
		["a reached limit", tooManyRequests(60), "TOO_MANY_REQUESTS"],
	])("keeps the message of %s under its code", (_, error, code) => {
		const masked = maskError(thrownInResolver(error), GENERIC);

		expect(masked).toMatchObject({
			message: error.message,
			extensions: expect.objectContaining({ code }),
		});
	});

	it.each([
		[
			"any other error",
			new Error(`connect ECONNREFUSED ${faker.internet.ip()}`),
		],
		[
			"a ZodError from deeper than the input, such as a malformed row",
			z.object({ hash: z.string() }).safeParse({}).error as Error,
		],
	])("hides %s behind the generic message", (_, leak) => {
		const masked = maskError(thrownInResolver(leak), GENERIC);

		expect(masked).toMatchObject({
			message: GENERIC,
			extensions: { code: "INTERNAL_SERVER_ERROR" },
		});
	});
});
