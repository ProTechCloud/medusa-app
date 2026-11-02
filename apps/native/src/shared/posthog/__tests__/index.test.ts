import "@/shared/posthog";
import { mockPostHogOptions } from "@/testing/mock-posthog-react-native";

describe("the PostHog client", () => {
	it("records every session with all text and images masked", () => {
		const options = mockPostHogOptions();

		expect(options).toMatchObject({
			enableSessionReplay: true,
			sessionReplayConfig: { maskAllTextInputs: true, maskAllImages: true },
		});
		expect(options).not.toHaveProperty("sessionReplayConfig.sampleRate");
	});
});
