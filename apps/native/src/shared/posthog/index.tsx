import PostHog, {
	PostHogProvider as PostHogSdkProvider,
} from "posthog-react-native";
import type { ReactNode } from "react";
import { API_URL } from "@/config/api";
import { appConfig } from "@/config/app-config";

/** The app's one PostHog client. Without a token it sends nothing. */
export const posthog = new PostHog(appConfig.posthogProjectToken ?? "", {
	host: appConfig.posthogHost,
	disabled: !appConfig.posthogProjectToken,
	// Requests to the API carry the identity headers, so a trace links to its
	// replay.
	addTracingHeaders: [new URL(API_URL).hostname],
	enableSessionReplay: true,
	sessionReplayConfig: {
		maskAllTextInputs: true,
		maskAllImages: true,
	},
	errorTracking: {
		autocapture: {
			uncaughtExceptions: true,
			unhandledRejections: true,
			nativeCrashes: true,
			androidNdkCrashes: true,
		},
	},
});

/** Wraps the app in the client. Touches are captured; screens are sent by `usePostHogScreens`. */
export function PostHogProvider({ children }: { children: ReactNode }) {
	return (
		<PostHogSdkProvider
			autocapture={{ captureScreens: false, captureTouches: true }}
			client={posthog}
		>
			{children}
		</PostHogSdkProvider>
	);
}
