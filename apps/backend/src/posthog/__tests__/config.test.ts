import { describe, expect, it } from "vitest";
import { generatePostHogEnv } from "@/posthog/__mocks__/generate-posthog-env";
import { parsePostHogConfig } from "@/posthog/lib/config";

describe("parsePostHogConfig", () => {
	it("a full environment parses into the config", () => {
		const env = generatePostHogEnv();

		expect(parsePostHogConfig(env)).toEqual({
			token: env.POSTHOG_PROJECT_TOKEN,
			host: env.POSTHOG_HOST,
			traces: env.POSTHOG_TRACES === "true",
			logs: env.POSTHOG_LOGS === "true",
			errors: env.POSTHOG_ERRORS === "true",
			maxQueueSize: Number(env.POSTHOG_MAX_QUEUE_SIZE),
			flushAt: Number(env.POSTHOG_FLUSH_AT),
			flushIntervalMs: Number(env.POSTHOG_FLUSH_INTERVAL_MS),
		});
	});

	it.each([
		{ label: "missing", value: undefined },
		{ label: "blank", value: " " },
	])("is null when the token is $label, so nothing is sent", ({ value }) => {
		const env = generatePostHogEnv({ POSTHOG_PROJECT_TOKEN: value });

		expect(parsePostHogConfig(env)).toBeNull();
	});

	it("with only a token, sends every signal to PostHog Cloud US with the client's own queue settings", () => {
		const token = generatePostHogEnv().POSTHOG_PROJECT_TOKEN;

		expect(parsePostHogConfig({ POSTHOG_PROJECT_TOKEN: token })).toEqual({
			token,
			host: "https://us.i.posthog.com",
			traces: true,
			logs: true,
			errors: true,
		});
	});

	it.each(["POSTHOG_TRACES", "POSTHOG_LOGS", "POSTHOG_ERRORS"])(
		"a %s that is not a boolean is named in the error",
		(name) => {
			const env = generatePostHogEnv({ [name]: "sometimes" });

			expect(() => parsePostHogConfig(env)).toThrow(`${name}: `);
		},
	);

	it.each([
		"POSTHOG_MAX_QUEUE_SIZE",
		"POSTHOG_FLUSH_AT",
		"POSTHOG_FLUSH_INTERVAL_MS",
	])(
		"a %s that is not above zero is named in the error, even without a token",
		(name) => {
			const env = generatePostHogEnv({
				POSTHOG_PROJECT_TOKEN: undefined,
				[name]: "0",
			});

			expect(() => parsePostHogConfig(env)).toThrow(
				`${name}: must be above zero`,
			);
		},
	);

	it("never repeats the token in an error", () => {
		const env = generatePostHogEnv({ POSTHOG_HOST: "not a url" });

		const parse = () => parsePostHogConfig(env);

		expect(parse).toThrow("POSTHOG_HOST: ");
		expect(parse).not.toThrow(env.POSTHOG_PROJECT_TOKEN);
	});

	it.each(["/", "//"])(
		"drops the trailing %s from POSTHOG_HOST, so the paths after it start with one slash",
		(slash) => {
			const env = generatePostHogEnv();

			const config = parsePostHogConfig({
				...env,
				POSTHOG_HOST: `${env.POSTHOG_HOST}${slash}`,
			});

			expect(config?.host).toBe(env.POSTHOG_HOST);
		},
	);
});
