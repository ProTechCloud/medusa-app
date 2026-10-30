import { resetAllStores } from "@/shared/zustand";
import { mockFetch } from "./mock-fetch";

// Loaded before every test file, by `setupFilesAfterEnv` in `jest.config.js`.

// `t("title")` in the `home` namespace renders `home.title`, so a test finds
// a string by its key, whatever the English copy says.
jest.mock("react-i18next", () => ({
	useTranslation: (namespace?: string) => ({
		t: (key: string) => (namespace ? `${namespace}.${key}` : key),
		i18n: { changeLanguage: jest.fn() },
	}),
	initReactI18next: { type: "3rdParty", init: jest.fn() },
	Trans: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-router", () =>
	require("@/testing/mock-expo-router-with-replace"),
);

// The build's `extra`, as `app.config.ts` would write it.
jest.mock("expo-constants", () => {
	const { faker } = require("@faker-js/faker");
	return {
		__esModule: true,
		default: {
			expoConfig: {
				extra: { appEnv: faker.helpers.arrayElement(["dev", "stg", "prd"]) },
			},
		},
	};
});

jest.mock("expo-localization", () => ({
	getLocales: () => [{ languageCode: "en", regionCode: "US" }],
	getCalendars: () => [{ timeZone: "UTC" }],
}));

jest.mock("react-native-safe-area-context", () => ({
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
	SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

globalThis.fetch = mockFetch.fetch as typeof fetch;

beforeEach(() => {
	resetAllStores();
	mockFetch.reset();
});
