import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { API_URL } from "@/config/api";
import { PostHogProvider, posthog } from "@/shared/posthog";
import { mockPostHogProviderProps } from "@/testing/mock-posthog-react-native";

/** Builds the client from scratch, as a launch does, with the build's `token`. */
function loadClientOptions(token?: string): Record<string, unknown> {
	let options: Record<string, unknown> = {};
	jest.isolateModules(() => {
		const constants = require("expo-constants").default;
		constants.expoConfig.extra.posthogProjectToken = token;
		require("@/shared/posthog");
		options = require("posthog-react-native").mockPostHogOptions();
	});
	return options;
}

describe("the PostHog client", () => {
	it("records every session with all text and images masked", () => {
		const options = loadClientOptions();

		expect(options).toMatchObject({
			enableSessionReplay: true,
			sessionReplayConfig: { maskAllTextInputs: true, maskAllImages: true },
		});
		expect(options).not.toHaveProperty("sessionReplayConfig.sampleRate");
	});

	it.each([
		{ label: "disabled without a token", token: undefined, disabled: true },
		{
			label: "enabled with a token",
			token: faker.string.alphanumeric(20),
			disabled: false,
		},
	])("is $label", ({ token, disabled }) => {
		expect(loadClientOptions(token).disabled).toBe(disabled);
	});

	it("adds the identity headers on requests to the API's host", () => {
		const { addTracingHeaders } = loadClientOptions();

		expect(addTracingHeaders).toEqual([API_URL.replace("https://", "")]);
	});
});

describe("PostHogProvider", () => {
	it("wraps the app in the client, capturing touches and leaving screens to the hook", async () => {
		await render(
			<PostHogProvider>
				<View testID="app" />
			</PostHogProvider>,
		);

		expect(screen.getByTestId("app")).toBeOnTheScreen();
		expect(mockPostHogProviderProps()).toEqual({
			autocapture: { captureScreens: false, captureTouches: true },
			client: posthog,
		});
	});
});
