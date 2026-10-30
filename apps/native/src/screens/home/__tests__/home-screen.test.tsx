import { faker } from "@faker-js/faker";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/home";
import { generateVersion } from "@/screens/home/__mocks__/generate-version";
import { mockBlur, mockFocus } from "@/testing/mock-expo-router-with-replace";
import { mockFetch } from "@/testing/mock-fetch";

describe("HomeScreen", () => {
	it("shows that it is checking until the API answers", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 1000 });

		await render(<HomeScreen />);

		expect(screen.getByTestId("home-api-checking")).toBeOnTheScreen();
		await screen.findByTestId("home-api-version");
		expect(screen.queryByTestId("home-api-checking")).not.toBeOnTheScreen();
	});

	it("shows the service, version, short commit and environment the API answered", async () => {
		const version = generateVersion();
		mockFetch.on("/version", { body: version });

		await render(<HomeScreen />);

		expect(await screen.findByTestId("home-api-version")).toBeOnTheScreen();
		expect(screen.getByText(version.service)).toBeOnTheScreen();
		expect(screen.getByText(version.version)).toBeOnTheScreen();
		expect(screen.getByText(version.commit.slice(0, 7))).toBeOnTheScreen();
		expect(screen.getByText(version.environment)).toBeOnTheScreen();
	});

	it.each([
		{
			label: "a 500, even with a version in its body",
			answer: { status: 500, body: generateVersion() },
		},
		{
			label: "a network error",
			answer: new TypeError("Network request failed"),
		},
		{
			label: "a body without the version fields",
			answer: { body: { message: faker.lorem.word() } },
		},
	])("shows the failure after $label", async ({ answer }) => {
		mockFetch.on("/version", answer);

		await render(<HomeScreen />);

		expect(await screen.findByTestId("home-api-failed")).toBeOnTheScreen();
		expect(screen.queryByTestId("home-api-version")).not.toBeOnTheScreen();
	});

	it("asks the API again from the failure and shows the version it answers", async () => {
		mockFetch.on("/version", { status: 500 });
		await render(<HomeScreen />);
		await screen.findByTestId("home-api-failed");
		const version = generateVersion();
		mockFetch.on("/version", { body: version });

		await userEvent.press(screen.getByTestId("home-api-try-again"));

		expect(await screen.findByText(version.service)).toBeOnTheScreen();
		expect(mockFetch.calls("/version")).toBe(2);
	});

	it("gives up and shows the failure when the API has not answered in 10 seconds", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 60_000 });
		await render(<HomeScreen />);

		await act(() => jest.advanceTimersByTimeAsync(9_999));
		expect(screen.getByTestId("home-api-checking")).toBeOnTheScreen();
		await act(() => jest.advanceTimersByTimeAsync(1));

		expect(screen.getByTestId("home-api-failed")).toBeOnTheScreen();
		expect(mockFetch.cancelled("/version")).toBe(1);
	});

	it("cancels the request in flight when the screen loses focus, without showing a failure", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 5000 });
		await render(<HomeScreen />);

		await act(async () => mockBlur());

		expect(mockFetch.cancelled("/version")).toBe(1);
		expect(screen.queryByTestId("home-api-failed")).not.toBeOnTheScreen();
		expect(screen.getByTestId("home-api-checking")).toBeOnTheScreen();
	});

	it("asks again when the screen comes back into focus", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 5000 });
		await render(<HomeScreen />);
		const version = generateVersion();
		mockFetch.on("/version", { body: version });
		await act(async () => mockBlur());

		await act(async () => mockFocus());

		expect(await screen.findByText(version.service)).toBeOnTheScreen();
		expect(mockFetch.calls("/version")).toBe(2);
	});

	it("never lets the cancelled earlier request overwrite the newer one after a quick tab switch", async () => {
		mockFetch.on("/version", { body: generateVersion(), delayMs: 5000 });
		await render(<HomeScreen />);
		const version = generateVersion();
		mockFetch.on("/version", { body: version, delayMs: 1000 });

		await act(async () => {
			mockBlur();
			mockFocus();
		});

		expect(screen.getByTestId("home-api-checking")).toBeOnTheScreen();
		expect(screen.queryByTestId("home-api-failed")).not.toBeOnTheScreen();
		await act(() => jest.advanceTimersByTimeAsync(5000));
		expect(screen.getByText(version.service)).toBeOnTheScreen();
	});
});
