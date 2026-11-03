import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { API_URL } from "@/config/api";
import { PostHogProvider, posthog } from "@/shared/posthog";
import { mockPostHogProviderProps } from "@/testing/mock-posthog-react-native";

/** Builds the client from scratch, as a launch does, with the build's `token`. */
function loadClient(token?: string): {
	builtWith: string;
	options: Record<string, unknown>;
} {
	let builtWith = "";
	let options: Record<string, unknown> = {};
	jest.isolateModules(() => {
		const constants = require("expo-constants").default;
		constants.expoConfig.extra.posthogProjectToken = token;
		require("@/shared/posthog");
		const sdk = require("posthog-react-native");
		builtWith = sdk.mockPostHogToken();
		options = sdk.mockPostHogOptions();
	});
	return { builtWith, options };
}

describe("the PostHog client", () => {
	it("records every session with all text and images masked", () => {
		const { options } = loadClient();

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
		expect(loadClient(token).options.disabled).toBe(disabled);
	});

	it("is built with the build's token", () => {
		const token = faker.string.alphanumeric(20);

		expect(loadClient(token).builtWith).toBe(token);
	});

	it("never gives the SDK an empty token, which it reports as an error on launch", () => {
		expect(loadClient().builtWith).not.toBe("");
	});

	it("adds the identity headers on requests to the API's host", () => {
		const { addTracingHeaders } = loadClient().options;

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
