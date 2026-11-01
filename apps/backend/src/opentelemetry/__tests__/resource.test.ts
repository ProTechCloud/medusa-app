import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateEnv } from "@/config/__mocks__/generate-env";
import {
	buildResource,
	readServiceIdentity,
} from "@/opentelemetry/lib/resource";

const API_ENTRY_POINT = "/app/apps/backend/src/services/api/index.ts";

describe("readServiceIdentity", () => {
	it("reads the service from the entry point, and the environment, version and commit as set", () => {
		const env = generateEnv();

		expect(readServiceIdentity(env, API_ENTRY_POINT)).toEqual({
			service: "api",
			environment: env.APP_ENV,
			version: env.APP_VERSION,
			commit: env.APP_COMMIT,
		});
	});

	it("takes OTEL_SERVICE_NAME over the entry point", () => {
		const name = faker.lorem.slug();

		expect(
			readServiceIdentity(
				generateEnv({ OTEL_SERVICE_NAME: name }),
				API_ENTRY_POINT,
			).service,
		).toBe(name);
	});

	it("never refuses an environment, so a bad one reaches the config parse in start()", () => {
		const identity = readServiceIdentity(
			{ APP_ENV: faker.lorem.word() },
			`/app/${faker.system.fileName()}`,
		);

		expect(identity).toEqual({
			service: "unknown_service",
			environment: expect.any(String),
			version: "dev",
			commit: "local",
		});
	});

	it("names an environment that is not set unknown", () => {
		expect(readServiceIdentity({}, API_ENTRY_POINT).environment).toBe(
			"unknown",
		);
	});
});

describe("buildResource", () => {
	it("names the service, its commit and its environment", () => {
		const identity = readServiceIdentity(generateEnv(), API_ENTRY_POINT);

		expect(buildResource(identity).attributes).toEqual({
			"service.name": "api",
			"service.version": identity.commit,
			"deployment.environment.name": identity.environment,
		});
	});
});
