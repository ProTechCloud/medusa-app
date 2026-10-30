import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { buildApp } from "@/services/api";

describe("the API", () => {
	it("the health check reports ok and how long the process has been up", async () => {
		const response = await buildApp().request("/health");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "ok",
			uptime: expect.any(Number),
		});
	});

	it.each([
		{ label: "the root, which no route answers any more", path: "/" },
		{ label: "an unknown path", path: `/${faker.lorem.slug()}` },
	])(
		"$label answers the JSON 404 with the path it was asked",
		async ({ path }) => {
			const response = await buildApp().request(path);

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ error: "not_found", path });
		},
	);
});
