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
		// The logger parses these at import; tests that read logs use their own.
		env: { LOG_LEVEL: "silent", LOG_FORMAT: "json" },
		// Before every test, each mock drops what the last test set and goes
		// back to the implementation it was created with; a bare `vi.fn()` goes
		// back to returning `undefined`. Mocks are created with an implementation
		// that throws, so they fail again until a test sets a result.
		mockReset: true,
		coverage,
	},
});
