import { vi } from "vitest";

/**
 * Stands in for what the crash handler in `shared/shutdown.ts` calls, so a
 * test sees the order without a PostHog client or an SDK. A test wires each
 * over its real module, keeping the rest:
 * `vi.mock("@/posthog", async (original) => ({ ...(await original()), captureErrorNow: mockCrashDependencies().captureErrorNow }))`,
 * and the same for `logCrash` from `@/logger` and `flushTelemetry` from
 * `@/shared/flush-telemetry`. Each resolves at once by default.
 */
export function mockCrashDependencies(
	overrides: Partial<{
		logCrash: (error: unknown, origin: string) => void;
		captureErrorNow: (error: unknown) => Promise<void>;
		flushTelemetry: () => Promise<void>;
	}> = {},
) {
	return {
		logCrash: vi.fn(
			overrides.logCrash ??
				((_error: unknown, _origin: string): void => undefined),
		),
		captureErrorNow: vi.fn(
			overrides.captureErrorNow ??
				(async (_error: unknown): Promise<void> => undefined),
		),
		flushTelemetry: vi.fn(
			overrides.flushTelemetry ?? (async (): Promise<void> => undefined),
		),
	};
}
