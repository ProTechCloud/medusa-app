import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePostHogEnv } from "@/posthog/__mocks__/generate-posthog-env";

vi.mock("posthog-node", () => import("@/posthog/__mocks__/mock-posthog-node"));

/**
 * `@/posthog` loaded fresh, so it parses an environment the test set, with
 * the client stand-in it was loaded with.
 */
async function loadPostHog(env: Record<string, string | undefined>) {
	for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
	vi.resetModules();
	return {
		posthog: await import("@/posthog"),
		// Through the mocked module itself, which is the copy `@/posthog` got.
		client: (await import(
			"posthog-node"
		)) as unknown as typeof import("@/posthog/__mocks__/mock-posthog-node"),
	};
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("captureError", () => {
	it("reports the error with the request's correlation ID and session", async () => {
		const env = generatePostHogEnv({ POSTHOG_ERRORS: "true" });
		const { posthog, client } = await loadPostHog(env);
		const { withCorrelationId } = await import(
			"@/opentelemetry/lib/log-correlation"
		);
		const error = new Error(faker.lorem.sentence());
		const correlationId = faker.string.uuid();
		const identity = {
			distinctId: faker.string.uuid(),
			sessionId: faker.string.uuid(),
		};

		withCorrelationId(correlationId, () =>
			posthog.withRequestIdentity(identity, () => posthog.captureError(error)),
		);

		expect(client.created).toHaveBeenCalledWith(
			env.POSTHOG_PROJECT_TOKEN,
			expect.objectContaining({
				host: env.POSTHOG_HOST,
				enableExceptionAutocapture: true,
			}),
		);
		expect(client.captureException).toHaveBeenCalledWith(
			error,
			identity.distinctId,
			{
				correlationId,
				$session_id: identity.sessionId,
			},
		);
	});

	it.each([
		{
			label: "without a token",
			env: generatePostHogEnv({ POSTHOG_PROJECT_TOKEN: undefined }),
		},
		{
			label: "with errors switched off",
			env: generatePostHogEnv({ POSTHOG_ERRORS: "false" }),
		},
	])("sends nothing $label", async ({ env }) => {
		const { posthog, client } = await loadPostHog(env);

		posthog.captureError(new Error(faker.lorem.sentence()));

		expect(client.created).not.toHaveBeenCalled();
		expect(client.captureException).not.toHaveBeenCalled();
	});
});

describe("shutdownPostHog", () => {
	it("sends what is queued once a client exists", async () => {
		const { posthog, client } = await loadPostHog(
			generatePostHogEnv({ POSTHOG_ERRORS: "true" }),
		);
		posthog.captureError(new Error(faker.lorem.sentence()));

		await posthog.shutdownPostHog();

		expect(client.shutdown).toHaveBeenCalledTimes(1);
	});

	it("resolves at once when no client was built", async () => {
		const { posthog, client } = await loadPostHog(
			generatePostHogEnv({ POSTHOG_PROJECT_TOKEN: undefined }),
		);

		await posthog.shutdownPostHog();

		expect(client.shutdown).not.toHaveBeenCalled();
	});
});
