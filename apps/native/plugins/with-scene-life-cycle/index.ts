import {
	type ConfigPlugin,
	withAppDelegate,
	withInfoPlist,
} from "expo/config-plugins";

// iOS 27 stops at launch, with no message, an app that has not adopted the
// scene-based life cycle. Expo 57 ships the scene delegate that does it,
// `ExpoAppSceneDelegate`, but its template does not wire it: the AppDelegate
// it generates still creates the window, and its Info.plist has no scene
// manifest. Expo 58's template does both, the same way as below, so this
// plugin goes when the app moves to Expo 58.

// The Objective-C name `ExpoAppSceneDelegate` is exported under, so the
// manifest needs no module prefix and no Swift file of our own.
const SCENE_DELEGATE = "EXExpoAppSceneDelegate";

const APP_DELEGATE_CLASS = "class AppDelegate: ExpoAppDelegate {";

// What the template's AppDelegate runs at launch to make the window and start
// React Native into it. The scene delegate does both now, from the factory
// the AppDelegate still creates and hands over as an
// `ExpoReactNativeFactoryProvider`.
const WINDOW_AT_LAUNCH = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const WINDOW_IN_SCENE = `    // The window is created and React Native is started by ExpoAppSceneDelegate,
    // under the scene-based life cycle iOS 27 requires.
`;

/**
 * Rewrites the template's AppDelegate for the scene-based life cycle. Stops
 * the prebuild when the template no longer reads as expected, rather than
 * building an app that closes at launch.
 */
export function adoptSceneLifeCycle(appDelegate: string): string {
	for (const [name, expected] of [
		["the AppDelegate class", APP_DELEGATE_CLASS],
		["the window it creates at launch", WINDOW_AT_LAUNCH],
	]) {
		if (!appDelegate.includes(expected)) {
			throw new Error(
				`with-scene-life-cycle: ${name} is not where Expo's template had it. Check whether the template now adopts the scene life cycle itself, and remove this plugin if it does.`,
			);
		}
	}
	return appDelegate
		.replace(
			APP_DELEGATE_CLASS,
			"class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
		)
		.replace(WINDOW_AT_LAUNCH, WINDOW_IN_SCENE);
}

const sceneManifest = {
	UIApplicationSupportsMultipleScenes: false,
	UISceneConfigurations: {
		UIWindowSceneSessionRoleApplication: [
			{
				UISceneConfigurationName: "Default Configuration",
				UISceneDelegateClassName: SCENE_DELEGATE,
			},
		],
	},
};

const withSceneLifeCycle: ConfigPlugin = (config) =>
	withAppDelegate(
		withInfoPlist(config, (plist) => {
			plist.modResults.UIApplicationSceneManifest = sceneManifest;
			return plist;
		}),
		(delegate) => {
			delegate.modResults.contents = adoptSceneLifeCycle(
				delegate.modResults.contents,
			);
			return delegate;
		},
	);

export default withSceneLifeCycle;
