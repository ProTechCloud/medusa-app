import { afterEach, describe, expect, it, vi } from "vitest";
import { FLUSH_TIMEOUT_MS, withinFlushTimeout } from "@/shared/flush-telemetry";

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
