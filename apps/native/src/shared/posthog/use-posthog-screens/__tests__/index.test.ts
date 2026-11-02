import { faker } from "@faker-js/faker";
import { renderHook } from "@testing-library/react-native";
import { usePostHogScreens } from "@/shared/posthog/use-posthog-screens";
import { mockPathname } from "@/testing/mock-expo-router-with-replace";
import { mockScreen } from "@/testing/mock-posthog-react-native";

describe("usePostHogScreens", () => {
	beforeEach(() => {
		mockScreen.mockClear();
	});

	it("sends the pathname once for each route the user lands on", async () => {
		const first = `/${faker.lorem.slug()}`;
		const second = `/${faker.lorem.slug()}`;
		mockPathname.mockReturnValue(first);
		const { rerender } = await renderHook(() => usePostHogScreens());

		await rerender({});
		mockPathname.mockReturnValue(second);
		await rerender({});

		expect(mockScreen.mock.calls).toEqual([[first], [second]]);
	});
});
