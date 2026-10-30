import { act, renderHook } from "@testing-library/react-native";
import { generateVersion } from "@/screens/home/__mocks__/generate-version";
import { useApiVersion } from "@/screens/home/hooks/use-api-version";
import { mockFetch } from "@/testing/mock-fetch";

describe("useApiVersion", () => {
	it("never lets an earlier answer that arrives late overwrite a newer one", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 3000 });
		const { result } = await renderHook(() => useApiVersion());
		const newer = generateVersion();
		mockFetch.on("/version", { body: newer, delayMs: 1000 });

		await act(async () => result.current.check());
		await act(() => jest.advanceTimersByTimeAsync(3000));

		expect(mockFetch.calls("/version")).toBe(2);
		expect(result.current.status).toBe("ok");
		expect(result.current.version).toEqual(newer);
	});
});
