import path from "node:path";
import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		// The logger parses these at import, and names its lines from the
		// config; tests that read logs build their own with `createLogger`.
		env: {
			LOG_LEVEL: "silent",
			LOG_FORMAT: "json",
			APP_ENV: "local",
			OTEL_SERVICE_NAME: "api",
		},
		// Before every test, each mock drops what the last test set and goes
		// back to the implementation it was created with; a bare `vi.fn()` goes
		// back to returning `undefined`. Mocks are created with an implementation
		// that throws, so they fail again until a test sets a result.
		mockReset: true,
		coverage,
	},
});
