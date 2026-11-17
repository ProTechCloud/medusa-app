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
			db: {
				url: `postgresql://${encodeURIComponent(String(env.DB_USER))}:${encodeURIComponent(String(env.DB_PASSWORD))}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
			},
			auth: { secret: env.BETTER_AUTH_SECRET, url: env.BETTER_AUTH_URL },
			pubsub: {
				projectId: env.PUBSUB_PROJECT_ID,
				emailsTopic: env.PUBSUB_EMAILS_TOPIC,
			},
			trustedProxies: Number(env.TRUSTED_PROXIES),
			mailgun: {
				apiKey: env.MAILGUN_API_KEY,
				domain: env.MAILGUN_DOMAIN,
				from: env.MAILGUN_FROM,
			},
			workerPort: Number(env.WORKER_PORT),
			shouldRunMigration: env.SHOULD_RUN_MIGRATION === "true",
		});
	});

	it("names every missing database, auth and queue variable in one error", () => {
		const env = generateEnv({
			DB_HOST: undefined,
			DB_NAME: undefined,
			DB_USER: undefined,
			DB_PASSWORD: undefined,
			BETTER_AUTH_SECRET: undefined,
			BETTER_AUTH_URL: undefined,
			PUBSUB_EMAILS_TOPIC: undefined,
		});

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(
			[
				"Invalid environment:",
				"  DB_HOST: is not set",
				"  DB_NAME: is not set",
				"  DB_USER: is not set",
				"  DB_PASSWORD: is not set",
				"  BETTER_AUTH_SECRET: is not set",
				"  BETTER_AUTH_URL: is not set",
				"  PUBSUB_EMAILS_TOPIC: is not set",
			].join("\n"),
		);
	});

	it.each([
		[
			"BETTER_AUTH_SECRET",
			faker.string.alphanumeric(31),
			"must be at least 32 characters",
		],
		["BETTER_AUTH_URL", faker.lorem.word(), "must be a URL"],
		["TRUSTED_PROXIES", "-1", "must be 0 or more"],
		["SHOULD_RUN_MIGRATION", "yes", "must be true or false"],
	])("a bad %s is named in the error", (name, value, reason) => {
		const env = generateEnv({ [name]: value });

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(
			`${name}: ${reason}`,
		);
	});

	it("refuses prd without a Mailgun key", () => {
		const env = generateEnv({ APP_ENV: "prd", MAILGUN_API_KEY: undefined });

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(
			"MAILGUN_API_KEY: is not set",
		);
	});

	it.each(["local", "stg"])("runs %s without a Mailgun key", (environment) => {
		const env = generateEnv({
			APP_ENV: environment,
			MAILGUN_API_KEY: undefined,
		});

		expect(buildConfig(env, API_ENTRY_POINT).mailgun.apiKey).toBeUndefined();
	});

	it("refuses a Mailgun key without its domain and sender", () => {
		const env = generateEnv({
			MAILGUN_DOMAIN: undefined,
			MAILGUN_FROM: undefined,
		});

		expect(() => buildConfig(env, API_ENTRY_POINT)).toThrow(
			["  MAILGUN_DOMAIN: is not set", "  MAILGUN_FROM: is not set"].join("\n"),
		);
	});

	it("escapes the database password in the connection string", () => {
		const password = `${faker.internet.password()}@:/#?`;
		const env = generateEnv({ DB_PASSWORD: password });

		const url = new URL(buildConfig(env, API_ENTRY_POINT).db.url);

		expect(decodeURIComponent(url.password)).toBe(password);
		expect(url.hostname).toBe(env.DB_HOST);
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
		{ name: "TRUSTED_PROXIES", field: "trustedProxies", fallback: 1 },
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
