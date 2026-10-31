import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { correlationFields } from "@/opentelemetry/lib/log-correlation";
import { requestCorrelation } from "@/services/api/http/lib/request-correlation";

function app(): Hono {
	return new Hono()
		.use("*", requestCorrelation)
		.get("/", (context) => context.json(correlationFields()));
}

describe("requestCorrelation", () => {
	it("tags the request with Cloudflare's cf-ray", async () => {
		const ray = `${faker.string.hexadecimal({ length: 16, prefix: "", casing: "lower" })}-GRU`;

		const response = await app().request("/", { headers: { "cf-ray": ray } });

		expect(await response.json()).toEqual({ correlationId: ray });
	});

	it("tags a request that did not come through Cloudflare with a new UUID", async () => {
		const response = await app().request("/");

		expect(await response.json()).toEqual({
			correlationId: expect.stringMatching(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			),
		});
	});
});
