const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace, so a change in packages/ reloads the app.
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then from the root, where Yarn hoists
// most of them; never by walking up from the importing file.
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	rootNodeModules,
];
config.resolver.disableHierarchicalLookup = true;

// One React in the bundle: `react`, `react-native` and their subpaths are
// looked up in the root node_modules only, so a copy under the app's
// node_modules, or any package's own, is never loaded. Every other module
// goes through the lookup above.
const PINNED = ["react", "react-native"];
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	const resolve = upstreamResolveRequest ?? context.resolveRequest;
	const pinned = PINNED.some(
		(name) => moduleName === name || moduleName.startsWith(`${name}/`),
	);
	return pinned
		? resolve(
				{ ...context, nodeModulesPaths: [rootNodeModules] },
				moduleName,
				platform,
			)
		: resolve(context, moduleName, platform);
};

// Tests and their mocks never reach the bundle. Expo's own list, which keeps
// out the native build folders and the Pods, stays.
config.resolver.blockList = [
	...config.resolver.blockList,
	/src\/.*\/__mocks__\//,
	/src\/.*\/__tests__\//,
];

module.exports = config;
