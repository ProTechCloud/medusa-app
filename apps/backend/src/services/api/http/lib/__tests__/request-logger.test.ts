import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HEALTH_PATH } from "@/services/api/http/lib/health-path";
import { createRequestLogger } from "@/services/api/http/lib/request-logger";
import { createCapturingLogger } from "@/testing/test-logger";

const pinoLevel = (name: string) => ({ info: 30, warn: 40, error: 50 })[name];

describe("requestLogger", () => {
	it("a request is logged once, after the response, with its status and duration", async () => {
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
				durationMs: expect.any(Number),
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

	it.each([
		{ status: 200, level: "info" },
		{ status: 302, level: "info" },
		{ status: 404, level: "warn" },
		{ status: 422, level: "warn" },
		{ status: 500, level: "error" },
		{ status: 503, level: "error" },
	])("a $status is logged as $level", async ({ status, level }) => {
		const capture = createCapturingLogger();
		const path = `/${faker.lorem.slug()}`;
		const app = new Hono()
			.use("*", createRequestLogger(capture.logger))
			.get(path, (context) => context.body(null, status as 200));

		await app.request(path);

		expect(capture.lines()[0]?.level).toBe(pinoLevel(level));
	});
});
