import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { captureError } from "@/posthog";
import { requestErrors } from "@/services/api/http/lib/request-errors";

vi.mock("@/posthog", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/posthog")>()),
	...(
		await import("@/services/api/http/lib/__mocks__/mock-capture-error")
	).mockCaptureError(),
}));

function appThatThrows(error: Error): Hono {
	return new Hono()
		.get("/boom", () => {
			throw error;
		})
		.onError(requestErrors);
}

describe("requestErrors", () => {
	it("a route that throws answers the JSON 500, which reveals nothing of the error", async () => {
		const response = await appThatThrows(
			new Error(faker.lorem.sentence()),
		).request("/boom");

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "internal_error" });
	});

	it("reports the error to PostHog once", async () => {
		const error = new Error(faker.lorem.sentence());

		await appThatThrows(error).request("/boom");

		expect(captureError).toHaveBeenCalledTimes(1);
		expect(captureError).toHaveBeenCalledWith(error);
	});
});
