import medusaPlugin from "@medusa/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/.turbo/**",
		],
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: tsParser,
		},
		rules: {
			// A name says what a value is. `t` is the translation function by
			// convention, `_` marks a value that is deliberately unused.
			"id-length": ["error", { min: 2, exceptions: ["t", "_"] }],
		},
	},
	{
		files: ["apps/*/src/**/*.{ts,tsx}"],
		...medusaPlugin.configs.recommended,
	},
	{
		files: ["packages/*/src/**/*.{ts,tsx}"],
		plugins: { "@medusa": medusaPlugin },
		rules: {
			"@medusa/kebab-case-folders": "error",
			"@medusa/folder-structure": "error",
		},
	},
];
