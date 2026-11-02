import "@/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { PostHogProvider } from "@/shared/posthog";
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
		<PostHogProvider>
			<StatusBar style="dark" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
			</Stack>
		</PostHogProvider>
	);
}
