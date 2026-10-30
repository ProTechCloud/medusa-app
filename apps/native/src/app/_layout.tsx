import "@/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
	hideSplashScreen,
	keepSplashScreenUntilReady,
} from "@/shared/splash-screen";

keepSplashScreenUntilReady();

export default function RootLayout() {
	useEffect(() => {
		hideSplashScreen();
	}, []);

	return (
		<>
			<StatusBar style="dark" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
			</Stack>
		</>
	);
}
