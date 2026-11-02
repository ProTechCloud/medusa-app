import "@/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider } from "posthog-react-native";
import { useEffect } from "react";
import { posthog } from "@/shared/posthog";
import { usePostHogScreens } from "@/shared/posthog/use-posthog-screens";
import {
	hideSplashScreen,
	keepSplashScreenUntilReady,
} from "@/shared/splash-screen";

keepSplashScreenUntilReady();

export default function RootLayout() {
	usePostHogScreens();

	useEffect(() => {
		hideSplashScreen();
	}, []);

	return (
		<PostHogProvider
			autocapture={{ captureScreens: false, captureTouches: true }}
			client={posthog}
		>
			<StatusBar style="dark" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
			</Stack>
		</PostHogProvider>
	);
}
