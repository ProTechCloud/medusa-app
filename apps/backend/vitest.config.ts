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
		coverage,
	},
});
