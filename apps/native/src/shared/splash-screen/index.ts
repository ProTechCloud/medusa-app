import * as SplashScreen from "expo-splash-screen";

/**
 * Keep the splash up past launch. Call it once, at module level in the root
 * layout, so the app never flashes an empty frame before its first screen.
 */
export function keepSplashScreenUntilReady(): void {
	void SplashScreen.preventAutoHideAsync();
}

/** Take the splash down: the first screen has rendered. */
export function hideSplashScreen(): void {
	void SplashScreen.hideAsync();
}
