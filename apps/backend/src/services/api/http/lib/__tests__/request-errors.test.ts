import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { requestErrors } from "@/services/api/http/lib/request-errors";

describe("requestErrors", () => {
	it("a route that throws answers a bare 500 that reveals nothing", async () => {
		const message = faker.lorem.sentence();
		const app = new Hono()
			.get("/boom", () => {
				throw new Error(message);
			})
			.onError(requestErrors);

		const response = await app.request("/boom");

		expect(response.status).toBe(500);
		expect(await response.text()).toBe("");
	});
});
