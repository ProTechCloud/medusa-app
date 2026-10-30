import "@/i18n";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

// Keep the splash up until the first screen has rendered, so the app never
// flashes an empty frame between the two.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	useEffect(() => {
		void SplashScreen.hideAsync();
	}, []);

	return (
		<>
			<StatusBar style="auto" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(tabs)" />
			</Stack>
		</>
	);
}
