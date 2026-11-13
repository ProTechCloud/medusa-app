import { faker } from "@faker-js/faker";
import type { ExpoConfig } from "expo/config";
import withSceneLifeCycle, { adoptSceneLifeCycle } from "..";
import { generateTemplateAppDelegate } from "../__mocks__/generate-template-app-delegate";

const TEMPLATE_CLASS = "class AppDelegate: ExpoAppDelegate {";
const ADOPTED_CLASS =
	"class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {";
const TEMPLATE_WINDOW = "#if os(iOS) || os(tvOS)";
const SCENE_COMMENT = `    // The window is created and React Native is started by ExpoAppSceneDelegate,
    // under the scene-based life cycle iOS 27 requires.
`;

type Mod = (config: Record<string, unknown>) => Promise<{
	modResults: unknown;
}>;

/** Runs one of the plugin's iOS mods on `modResults`, as prebuild does. */
async function runIosMod(name: string, modResults: unknown): Promise<unknown> {
	const config = withSceneLifeCycle({
		name: faker.word.noun(),
		slug: faker.word.noun(),
	} as ExpoConfig) as ExpoConfig & { mods: { ios: Record<string, Mod> } };
	const result = await config.mods.ios[name]({
		...config,
		modResults,
		modRequest: { platform: "ios", modName: name },
	});
	return result.modResults;
}

describe("withSceneLifeCycle", () => {
	it("hands the window to Expo's scene delegate in the template's AppDelegate", () => {
		const appDelegate = adoptSceneLifeCycle(generateTemplateAppDelegate());

		expect(appDelegate).toContain(
			"class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
		);
		expect(appDelegate).not.toContain("UIWindow(frame:");
		expect(appDelegate).not.toContain("startReactNative");
		// The factory the scene delegate starts React Native from.
		expect(appDelegate).toContain("reactNativeFactory = factory");
	});

	it("keeps the AppDelegate's link handlers, which the scene delegate forwards to", () => {
		const appDelegate = adoptSceneLifeCycle(generateTemplateAppDelegate());

		expect(appDelegate).toContain("open url: URL");
		expect(appDelegate).toContain("continue userActivity: NSUserActivity");
	});

	it("leaves an AppDelegate it already rewrote as it is", () => {
		const appDelegate = adoptSceneLifeCycle(generateTemplateAppDelegate());

		expect(adoptSceneLifeCycle(appDelegate)).toBe(appDelegate);
	});

	it.each([
		[
			"the class rewritten, the window not",
			(template: string) => template.replace(TEMPLATE_CLASS, ADOPTED_CLASS),
		],
		[
			"the window rewritten, the class not",
			(template: string) =>
				adoptSceneLifeCycle(template).replace(ADOPTED_CLASS, TEMPLATE_CLASS),
		],
		[
			"the class rewritten and the window removed some other way",
			(template: string) =>
				adoptSceneLifeCycle(template).replace(SCENE_COMMENT, ""),
		],
		[
			"the class and the comment rewritten, the window still created",
			(template: string) =>
				template
					.replace(TEMPLATE_CLASS, ADOPTED_CLASS)
					.replace(TEMPLATE_WINDOW, `${SCENE_COMMENT}${TEMPLATE_WINDOW}`),
		],
	])("stops the prebuild when an AppDelegate has %s", (_, rewriteHalf) => {
		const halfRewritten = rewriteHalf(generateTemplateAppDelegate());

		expect(() => adoptSceneLifeCycle(halfRewritten)).toThrow(
			"with-scene-life-cycle",
		);
	});

	it.each([
		["the AppDelegate class", "class AppDelegate: ExpoAppDelegate {"],
		["the window it creates at launch", "#if os(iOS) || os(tvOS)"],
	])("stops the prebuild when the template no longer has %s", (name, text) => {
		const changed = generateTemplateAppDelegate().replace(
			text,
			faker.lorem.word(),
		);

		expect(() => adoptSceneLifeCycle(changed)).toThrow(name);
	});

	it("rewrites the AppDelegate during prebuild", async () => {
		const modResults = (await runIosMod("appDelegate", {
			contents: generateTemplateAppDelegate(),
			language: "swift",
		})) as { contents: string };

		expect(modResults.contents).toContain("ExpoReactNativeFactoryProvider");
	});

	it("names Expo's scene delegate as the app's only scene in Info.plist", async () => {
		const plist = (await runIosMod("infoPlist", {})) as Record<string, unknown>;

		expect(plist.UIApplicationSceneManifest).toEqual({
			UIApplicationSupportsMultipleScenes: false,
			UISceneConfigurations: {
				UIWindowSceneSessionRoleApplication: [
					{
						UISceneConfigurationName: "Default Configuration",
						UISceneDelegateClassName: "EXExpoAppSceneDelegate",
					},
				],
			},
		});
	});
});
