import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { buildConfig, getConfig, setConfigForTests } from "@/config";
import { generateEnv } from "@/config/__mocks__/generate-env";
import { generateConfig } from "@/shared/__mocks__/generate-config";

const API_ENTRY_POINT = "/app/apps/backend/src/services/api/index.ts";

describe("buildConfig", () => {
	it("a full environment parses into the config", () => {
		const env = generateEnv();

		const config = buildConfig(env, API_ENTRY_POINT);

		expect(config).toEqual({
			service: "api",
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

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(
			"APP_ENV: is not set",
		);
	});

	it("an APP_ENV that is not local, stg or prd is named in the error", () => {
		const env = generateEnv({ APP_ENV: "production" });

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(/APP_ENV: /);
	});

	it("a bad port is named in the error", () => {
		const env = generateEnv({ PORT: "not-a-port" });

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(/PORT: /);
	});

	it.each([
		{ name: "PORT", field: "port", fallback: 8080 },
		{ name: "APP_VERSION", field: "version", fallback: "dev" },
		{ name: "APP_COMMIT", field: "commit", fallback: "local" },
	] as const)(
		"a blank $name falls back to its default",
		({ name, field, fallback }) => {
			const env = generateEnv({ [name]: "" });

			expect(buildConfig(env, API_ENTRY_POINT)[field]).toBe(fallback);
		},
	);
});

describe("the service name", () => {
	it("is the folder of the entry point under src/services", () => {
		const name = faker.helpers.slugify(faker.lorem.word()).toLowerCase();

		const config = buildConfig(
			generateEnv(),
			`/app/apps/backend/src/services/${name}/index.ts`,
		);

		expect(config.service).toBe(name);
	});

	it("is OTEL_SERVICE_NAME when it is set, whatever the entry point", () => {
		const name = faker.lorem.slug();

		const config = buildConfig(
			generateEnv({ OTEL_SERVICE_NAME: name }),
			faker.system.filePath(),
		);

		expect(config.service).toBe(name);
	});

	it("stops the boot when neither the entry point nor OTEL_SERVICE_NAME names it", () => {
		const entryPoint = `/app/${faker.system.fileName()}`;

		expect(() => buildConfig(generateEnv(), entryPoint)).toThrow(
			`Cannot name the service from ${entryPoint}`,
		);
	});
});

describe("getConfig", () => {
	it("returns the config a test registered, without reading the environment", () => {
		const fixture = generateConfig();
		setConfigForTests(fixture);

		expect(getConfig()).toBe(fixture);
	});
});
