import { faker } from "@faker-js/faker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logCrash } from "@/logger";
import { captureErrorNow } from "@/posthog";
import { flushTelemetry } from "@/shared/flush-telemetry";
import { exitOnCrash } from "@/shared/shutdown";

vi.mock("@/logger", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/logger")>()),
	logCrash: (
		await import("@/shared/__mocks__/mock-crash-dependencies")
	).mockCrashDependencies().logCrash,
}));
vi.mock("@/posthog", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/posthog")>()),
	captureErrorNow: (
		await import("@/shared/__mocks__/mock-crash-dependencies")
	).mockCrashDependencies().captureErrorNow,
}));
vi.mock("@/shared/flush-telemetry", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/shared/flush-telemetry")>()),
	flushTelemetry: (
		await import("@/shared/__mocks__/mock-crash-dependencies")
	).mockCrashDependencies().flushTelemetry,
}));

const EVENTS = ["uncaughtException", "unhandledRejection"] as const;

// A listener of either event, called as Node and Bun call it: the error or
// the reason, then the origin or the promise.
type TListener = (first: unknown, second: unknown) => void;

function listenersOf(event: (typeof EVENTS)[number]): TListener[] {
	return process.listeners(event) as unknown as TListener[];
}

// vitest listens for both events itself. Every test notes the listeners
// there before it, so the ones `exitOnCrash` adds are fired and then removed.
let before: Record<(typeof EVENTS)[number], TListener[]>;

function added(event: (typeof EVENTS)[number]): TListener[] {
	return listenersOf(event).filter(
		(listener) => !before[event].includes(listener),
	);
}

beforeEach(() => {
	before = {
		uncaughtException: listenersOf("uncaughtException"),
		unhandledRejection: listenersOf("unhandledRejection"),
	};
});

afterEach(() => {
	for (const event of EVENTS) {
		for (const listener of added(event)) {
			process.off(event, listener as unknown as () => void);
		}
	}
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("exitOnCrash", () => {
	it.each([
		{ event: "uncaughtException" as const, origin: "uncaughtException" },
		{ event: "unhandledRejection" as const, origin: "unhandledRejection" },
	])(
		"an $event writes the fatal line, reports it, flushes, then exits with 1",
		async ({ event, origin }) => {
			const exit = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never);
			const error = new Error(faker.lorem.sentence());
			exitOnCrash();

			for (const listener of added(event)) listener(error, origin);
			await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

			expect(logCrash).toHaveBeenCalledWith(error, origin);
			expect(captureErrorNow).toHaveBeenCalledWith(error);
			expect(flushTelemetry).toHaveBeenCalledTimes(1);
			const order = [logCrash, captureErrorNow, flushTelemetry].map(
				(spy) => vi.mocked(spy).mock.invocationCallOrder[0] ?? 0,
			);
			expect(order).toEqual([...order].sort((first, second) => first - second));
			expect(order.at(-1)).toBeLessThan(exit.mock.invocationCallOrder[0] ?? 0);
		},
	);

	it("still flushes and exits when the report fails", async () => {
		const exit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		vi.mocked(captureErrorNow).mockRejectedValue(
			new Error(faker.lorem.sentence()),
		);
		exitOnCrash();

		for (const listener of added("uncaughtException")) {
			listener(new Error(faker.lorem.sentence()), "uncaughtException");
		}
		await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

		expect(flushTelemetry).toHaveBeenCalledTimes(1);
	});

	it("exits with 1 after the flush timeout when PostHog never answers", async () => {
		vi.useFakeTimers();
		const exit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		vi.spyOn(process.stderr, "write").mockImplementation(() => true);
		vi.mocked(captureErrorNow).mockReturnValue(new Promise(() => undefined));
		exitOnCrash();

		for (const listener of added("unhandledRejection")) {
			listener(new Error(faker.lorem.sentence()), "unhandledRejection");
		}
		await vi.advanceTimersByTimeAsync(2999);
		expect(exit).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);

		expect(exit).toHaveBeenCalledWith(1);
	});
});
