import PostHog from "posthog-react-native";
import { appConfig } from "@/config/app-config";

// The host of `API_VERSION_URL` in `src/screens/home/hooks/use-api-version`.
// Its requests carry the identity headers, so a trace links to its replay.
const API_HOST = "api-stg-medusa.fabianalula.site";

/** The app's one PostHog client. Without a token it sends nothing. */
export const posthog = new PostHog(appConfig.posthogProjectToken ?? "", {
	host: appConfig.posthogHost,
	disabled: !appConfig.posthogProjectToken,
	addTracingHeaders: [API_HOST],
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
		},
	},
});
