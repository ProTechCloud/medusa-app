import { afterEach, describe, expect, it, vi } from "vitest";
import { shutdownTelemetry } from "@/opentelemetry";
import { shutdownPostHog } from "@/posthog";
import {
	FLUSH_TIMEOUT_MS,
	flushTelemetry,
	withinFlushTimeout,
} from "@/shared/flush-telemetry";

vi.mock("@/opentelemetry", async () => ({
	shutdownTelemetry: (
		await import("@/shared/__mocks__/mock-crash-dependencies")
	).mockCrashDependencies().shutdownTelemetry,
}));
vi.mock("@/posthog", async () => ({
	shutdownPostHog: (
		await import("@/shared/__mocks__/mock-crash-dependencies")
	).mockCrashDependencies().shutdownPostHog,
}));

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("withinFlushTimeout", () => {
	it("resolves when the flush does, and says nothing", async () => {
		const stderr = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);

		await withinFlushTimeout(Promise.resolve());

		expect(stderr).not.toHaveBeenCalled();
	});

	it("gives up after FLUSH_TIMEOUT_MS, so docker stop never has to kill the process, and says so on stderr", async () => {
		vi.useFakeTimers();
		const stderr = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		let done = false;

		void withinFlushTimeout(new Promise(() => undefined)).then(() => {
			done = true;
		});
		await vi.advanceTimersByTimeAsync(FLUSH_TIMEOUT_MS - 1);
		expect(done).toBe(false);
		await vi.advanceTimersByTimeAsync(1);

		expect(done).toBe(true);
		expect(JSON.parse(String(stderr.mock.calls[0]?.[0]))).toMatchObject({
			level: "error",
			msg: "telemetry flush timed out",
		});
	});
});

describe("flushTelemetry", () => {
	it("starts both at once, so one that stalls holds back nothing", async () => {
		vi.mocked(shutdownTelemetry).mockReturnValue(new Promise(() => undefined));

		void flushTelemetry();

		expect(shutdownTelemetry).toHaveBeenCalledTimes(1);
		expect(shutdownPostHog).toHaveBeenCalledTimes(1);
	});

	it("runs both to the end when one fails, and says so on stderr", async () => {
		const stderr = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		vi.mocked(shutdownTelemetry).mockRejectedValue(new Error("sdk failed"));

		await flushTelemetry();

		expect(shutdownPostHog).toHaveBeenCalledTimes(1);
		expect(JSON.parse(String(stderr.mock.calls[0]?.[0]))).toMatchObject({
			msg: "telemetry flush failed",
			error: "Error: sdk failed",
		});
	});
});
