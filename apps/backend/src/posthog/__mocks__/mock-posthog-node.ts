import { vi } from "vitest";

type TProperties = Record<string, unknown>;

/**
 * Stands in for the `posthog-node` module, so a test sees what would be sent
 * without a network. A test wires it with
 * `vi.mock("posthog-node", async () => (await import(<this file>)).mockPostHogNode())`
 * and reads the spies from `await import("posthog-node")`, the copy the code
 * under test got. Each spy defaults to doing nothing, as a client that
 * accepted the event would; an override replaces one.
 */
export function mockPostHogNode(
	overrides: Partial<{
		created: (token: string, options: unknown) => void;
		captureException: (
			error: unknown,
			distinctId?: string,
			properties?: TProperties,
		) => void;
		captureExceptionImmediate: (
			error: unknown,
			distinctId?: string,
			properties?: TProperties,
		) => Promise<void>;
		shutdown: () => Promise<void>;
	}> = {},
) {
	const spies = {
		created: vi.fn(
			overrides.created ??
				((_token: string, _options: unknown): void => undefined),
		),
		captureException: vi.fn(
			overrides.captureException ??
				((
					_error: unknown,
					_distinctId?: string,
					_properties?: TProperties,
				): void => undefined),
		),
		captureExceptionImmediate: vi.fn(
			overrides.captureExceptionImmediate ??
				(async (
					_error: unknown,
					_distinctId?: string,
					_properties?: TProperties,
				): Promise<void> => undefined),
		),
		shutdown: vi.fn(
			overrides.shutdown ?? (async (): Promise<void> => undefined),
		),
	};

	class PostHog {
		constructor(token: string, options: unknown) {
			spies.created(token, options);
		}

		captureException(
			error: unknown,
			distinctId?: string,
			properties?: TProperties,
		): void {
			spies.captureException(error, distinctId, properties);
		}

		captureExceptionImmediate(
			error: unknown,
			distinctId?: string,
			properties?: TProperties,
		): Promise<void> {
			return spies.captureExceptionImmediate(error, distinctId, properties);
		}

		shutdown(): Promise<void> {
			return spies.shutdown();
		}
	}

	return { ...spies, PostHog };
}
