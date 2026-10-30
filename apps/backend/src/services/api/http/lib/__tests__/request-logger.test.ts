import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HEALTH_PATH } from "@/services/api/http/lib/health-path";
import { createRequestLogger } from "@/services/api/http/lib/request-logger";
import { createCapturingLogger } from "@/testing/test-logger";

describe("requestLogger", () => {
	it("a request is logged once, after the response, with its status and latency", async () => {
		const capture = createCapturingLogger();
		const path = `/${faker.lorem.slug()}`;
		const app = new Hono()
			.use("*", createRequestLogger(capture.logger))
			.get(path, (context) => context.text("ok", 201));

		await app.request(path);

		expect(capture.lines()).toEqual([
			expect.objectContaining({
				msg: "request",
				method: "GET",
				path,
				status: 201,
				latencyMs: expect.any(Number),
			}),
		]);
	});

	it("the health probe is answered without a log line", async () => {
		const capture = createCapturingLogger();
		const app = new Hono()
			.use("*", createRequestLogger(capture.logger))
			.get(HEALTH_PATH, (context) => context.text("ok"));

		const response = await app.request(HEALTH_PATH);

		expect(response.status).toBe(200);
		expect(capture.lines()).toEqual([]);
	});
});
