const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace, so a change in packages/ reloads the app.
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then from the root, where Yarn hoists
// most of them; never by walking up from the importing file.
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Tests and their mocks never reach the bundle.
config.resolver.blockList = [/src\/.*\/__mocks__\//, /src\/.*\/__tests__\//];

module.exports = config;
