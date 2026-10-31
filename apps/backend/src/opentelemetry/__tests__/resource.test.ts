import { describe, expect, it } from "vitest";
import { buildResource } from "@/opentelemetry/lib/resource";
import { generateConfig } from "@/shared/__mocks__/generate-config";

describe("buildResource", () => {
	it("names the service, its commit and its environment, as the config does", () => {
		const config = generateConfig();

		const resource = buildResource(config);

		expect(resource.attributes).toEqual({
			"service.name": config.service,
			"service.version": config.commit,
			"deployment.environment.name": config.environment,
		});
	});
});
