import type { Rule } from "eslint";
import folderStructure from "./rules/folder-structure.ts";
import kebabCaseFolders from "./rules/kebab-case-folders.ts";
import noRelativeParentImports from "./rules/no-relative-parent-imports.ts";
import placement from "./rules/placement.ts";

interface MedusaPlugin {
	meta: { name: string; version: string };
	rules: Record<string, Rule.RuleModule>;
	configs: Record<string, unknown>;
}

const plugin: MedusaPlugin = {
	meta: {
		name: "@medusa/eslint-plugin",
		version: "0.0.0",
	},
	rules: {
		placement,
		"folder-structure": folderStructure,
		"kebab-case-folders": kebabCaseFolders,
		"no-relative-parent-imports": noRelativeParentImports,
	},
	configs: {},
};

plugin.configs.recommended = {
	plugins: { "@medusa": plugin },
	rules: {
		"@medusa/placement": "error",
		"@medusa/folder-structure": "error",
		"@medusa/kebab-case-folders": "error",
		"@medusa/no-relative-parent-imports": "error",
	},
};

export default plugin;
