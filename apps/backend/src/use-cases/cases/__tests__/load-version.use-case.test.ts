import { describe, expect, it } from "vitest";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { useCaseContextForEachTest } from "@/testing/use-case-context";
import { loadVersionUseCase } from "@/use-cases/cases/load-version.use-case";

const config = generateConfig();

describe("loadVersionUseCase", () => {
	useCaseContextForEachTest(() => ({ config }));

	it("reports the service, build and environment from the config", async () => {
		await expect(loadVersionUseCase()).resolves.toEqual({
			service: config.service,
			version: config.version,
			commit: config.commit,
			environment: config.environment,
		});
	});
});
