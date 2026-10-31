import { vi } from "vitest";

/**
 * Stands in for `captureError` from `@/posthog`, so a test can count the
 * reports without a PostHog client. A test wires it over the real module,
 * keeping the rest of `@/posthog`, which the logger reads:
 * `vi.mock("@/posthog", async (original) => ({ ...(await original()), ...(await import(<this file>)) }))`.
 * It returns nothing, as the real one does.
 */
export const captureError = vi.fn((_error: unknown): void => undefined);
