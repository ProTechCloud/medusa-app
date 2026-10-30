module.exports = {
	preset: "jest-expo",
	// Every test runs with fake timers, so nothing waits on a real clock.
	fakeTimers: { enableGlobally: true },
	setupFilesAfterEnv: ["./src/testing/mocks.ts"],
	// Packages that ship untranspiled modules, which Jest must compile like
	// the app's own code: React Native, Expo, and the ESM-only faker, i18next
	// and react-i18next.
	transformIgnorePatterns: [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@faker-js/.*|i18next|react-i18next|react-navigation|@react-navigation/.*))",
	],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	// The native projects Expo generates hold copies of packages; Jest must
	// not mistake them for the app's modules or tests.
	modulePathIgnorePatterns: ["<rootDir>/ios/", "<rootDir>/android/"],
	testPathIgnorePatterns: [
		"/node_modules/",
		"<rootDir>/ios/",
		"<rootDir>/android/",
	],
	collectCoverageFrom: [
		"src/**/*.{ts,tsx}",
		"!src/testing/**",
		"!src/**/__mocks__/**",
		"!src/**/__tests__/**",
	],
	coverageThreshold: {
		global: {
			statements: 50,
			branches: 50,
			functions: 50,
			lines: 50,
		},
	},
};
