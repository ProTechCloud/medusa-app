import { describe, expect, it, vi } from "vitest";
import { buildHttp } from "@/services/api/http";
import { generateVersion } from "@/services/api/http/routes/version/__mocks__/generate-version";
import { loadVersionUseCase } from "@/use-cases/cases/load-version.use-case";

vi.mock("@/use-cases/cases/load-version.use-case", async () =>
	(
		await import(
			"@/services/api/http/routes/version/__mocks__/mock-load-version-use-case"
		)
	).mockLoadVersionUseCase(),
);

describe("GET /version", () => {
	it("answers with the build that is running", async () => {
		const version = generateVersion();
		vi.mocked(loadVersionUseCase).mockResolvedValue(version);

		const response = await buildHttp().request("/version");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			message: "Hello World",
			...version,
		});
	});
});
