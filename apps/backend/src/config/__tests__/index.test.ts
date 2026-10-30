import { describe, expect, it } from "vitest";
import { buildConfig, getConfig, setConfigForTests } from "@/config";
import { generateEnv } from "@/config/__mocks__/generate-env";
import { generateConfig } from "@/shared/__mocks__/generate-config";

describe("buildConfig", () => {
	it("a full environment parses into the config", () => {
		const env = generateEnv();

		const config = buildConfig(env);

		expect(config).toEqual({
			service: "medusa-backend",
			environment: env.APP_ENV,
			port: Number(env.PORT),
			version: env.APP_VERSION,
			commit: env.APP_COMMIT,
		});
	});

	it.each([
		{ label: "missing", value: undefined },
		{ label: "blank", value: "" },
	])("an APP_ENV that is $label is named in the error", ({ value }) => {
		const env = generateEnv({ APP_ENV: value });

		expect(() => buildConfig(env)).toThrow("APP_ENV: is not set");
	});

	it("an APP_ENV that is not local, stg or prd is named in the error", () => {
		const env = generateEnv({ APP_ENV: "production" });

		expect(() => buildConfig(env)).toThrow(/APP_ENV: /);
	});

	it("a bad port is named in the error", () => {
		const env = generateEnv({ PORT: "not-a-port" });

		expect(() => buildConfig(env)).toThrow(/PORT: /);
	});

	it.each([
		{ name: "PORT", field: "port", fallback: 8080 },
		{ name: "APP_VERSION", field: "version", fallback: "dev" },
		{ name: "APP_COMMIT", field: "commit", fallback: "local" },
	] as const)(
		"a blank $name falls back to its default",
		({ name, field, fallback }) => {
			const env = generateEnv({ [name]: "" });

			expect(buildConfig(env)[field]).toBe(fallback);
		},
	);
});

describe("getConfig", () => {
	it("returns the config a test registered, without reading the environment", () => {
		const fixture = generateConfig();
		setConfigForTests(fixture);

		expect(getConfig()).toBe(fixture);
	});
});
