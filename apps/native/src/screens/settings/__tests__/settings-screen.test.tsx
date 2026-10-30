import { faker } from "@faker-js/faker";
import { render, screen, within } from "@testing-library/react-native";
import { appConfig } from "@/config/app-config";
import { SettingsScreen } from "@/screens/settings";
import { setBuild } from "@/screens/settings/__mocks__/mock-expo-application";

jest.mock(
	"expo-application",
	() =>
		require("@/screens/settings/__mocks__/mock-expo-application")
			.expoApplication,
);

describe("SettingsScreen", () => {
	it("shows the app's version, build and environment", () => {
		const version = faker.system.semver();
		const buildNumber = String(faker.number.int({ min: 1, max: 999 }));
		setBuild({
			nativeApplicationVersion: version,
			nativeBuildVersion: buildNumber,
		});

		render(<SettingsScreen />);

		expect(
			within(screen.getByTestId("settings-version")).getByText(version),
		).toBeOnTheScreen();
		expect(
			within(screen.getByTestId("settings-build")).getByText(buildNumber),
		).toBeOnTheScreen();
		expect(
			within(screen.getByTestId("settings-environment")).getByText(
				appConfig.appEnv,
			),
		).toBeOnTheScreen();
	});

	it("shows a dash for a version or build the native build does not report", () => {
		setBuild({ nativeApplicationVersion: null, nativeBuildVersion: null });

		render(<SettingsScreen />);

		for (const row of ["settings-version", "settings-build"]) {
			expect(
				within(screen.getByTestId(row)).getByText("settings.about.unknown"),
			).toBeOnTheScreen();
		}
	});
});
