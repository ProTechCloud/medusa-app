import { vi } from "vitest";

/** What the `PostHog` stand-in was built with and asked to capture, for a test to read. */
export const created = vi.fn(
	(_token: string, _options: unknown): void => undefined,
);
export const captureException = vi.fn(
	(
		_error: unknown,
		_distinctId?: string,
		_properties?: Record<string, unknown>,
	): void => undefined,
);
export const captureExceptionImmediate = vi.fn(
	async (
		_error: unknown,
		_distinctId?: string,
		_properties?: Record<string, unknown>,
	): Promise<void> => undefined,
);
export const shutdown = vi.fn(async (): Promise<void> => undefined);

/**
 * Stands in for `posthog-node`'s client, so a test sees what would be sent
 * without a network. A test wires it with
 * `vi.mock("posthog-node", () => import(<this file>))`.
 */
export class PostHog {
	constructor(token: string, options: unknown) {
		created(token, options);
	}

	captureException(
		error: unknown,
		distinctId?: string,
		properties?: Record<string, unknown>,
	): void {
		captureException(error, distinctId, properties);
	}

	captureExceptionImmediate(
		error: unknown,
		distinctId?: string,
		properties?: Record<string, unknown>,
	): Promise<void> {
		return captureExceptionImmediate(error, distinctId, properties);
	}

	shutdown(): Promise<void> {
		return shutdown();
	}
}
