import { faker } from "@faker-js/faker";
import type { ExpoConfig } from "expo/config";
import { generateBundleId } from "../__mocks__/generate-bundle-id";

const shell = { ...process.env };

/**
 * Loads `app.config.ts` from scratch, as a build does, with `APP_ENV` and
 * `APP_BUNDLE_ID` set in the shell and the env file holding `file`.
 */
function loadConfig(file: Record<string, string> | null): {
	config: () => ExpoConfig;
	readFile: () => string | undefined;
} {
	let config: ExpoConfig | undefined;
	let failure: unknown;
	let readFile: () => string | undefined = () => undefined;
	jest.isolateModules(() => {
		jest.doMock("dotenv", () => require("../__mocks__/mock-dotenv"));
		const dotenv = require("../__mocks__/mock-dotenv");
		dotenv.mockEnvFile(file);
		readFile = dotenv.mockEnvFileRead;
		try {
			config = require("../app.config").default;
		} catch (error) {
			failure = error;
		}
	});
	return {
		config: () => {
			if (failure) throw failure;
			return config as ExpoConfig;
		},
		readFile,
	};
}

describe("app.config.ts", () => {
	let appEnv: "dev" | "stg" | "prd";

	beforeEach(() => {
		appEnv = faker.helpers.arrayElement(["dev", "stg", "prd"]);
		process.env.APP_ENV = appEnv;
		// A bundle ID left in the shell by another build, which must never win.
		process.env.APP_BUNDLE_ID = generateBundleId();
	});

	afterEach(() => {
		process.env = { ...shell };
	});

	it("builds with the bundle ID from the selected environment's file, not the shell's", () => {
		const bundleId = generateBundleId();

		const { config, readFile } = loadConfig({ APP_BUNDLE_ID: bundleId });

		expect(readFile()).toMatch(new RegExp(`/\\.env\\.${appEnv}$`));
		expect(config().ios?.bundleIdentifier).toBe(bundleId);
		expect(config().android?.package).toBe(bundleId);
	});

	it("stops the build, naming the file, when the environment's file is missing", () => {
		const { config } = loadConfig(null);

		expect(config).toThrow(`.env.${appEnv} not found in apps/native`);
	});

	it.each<{ label: string; file: Record<string, string>; message: string }>([
		{ label: "unset", file: {}, message: "is not set" },
		{
			label: "not a bundle ID",
			file: { APP_BUNDLE_ID: faker.lorem.words(3) },
			message: "is not a bundle ID",
		},
	])("stops the build when APP_BUNDLE_ID is $label", ({ file, message }) => {
		const { config } = loadConfig(file);

		expect(config).toThrow(`APP_BUNDLE_ID: ${message}`);
	});
});
