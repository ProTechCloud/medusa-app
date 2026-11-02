import { faker } from "@faker-js/faker";
import type { ExpoConfig } from "expo/config";
import { generateBundleId } from "../__mocks__/generate-bundle-id";
import { generateCliKeys } from "../__mocks__/generate-cli-keys";

const shell = { ...process.env };

type TDisk = {
	/** What `.env.<APP_ENV>.local` holds; missing when not given. */
	local?: Record<string, string>;
	/** Whether `.env.dev.local`, the CLI's file, is on the Mac. */
	cliFileExists?: boolean;
};

/**
 * Loads `app.config.ts` from scratch, as a build does, with `APP_ENV` and
 * `APP_BUNDLE_ID` set in the shell and the env file holding `file`.
 */
function loadConfig(
	file: Record<string, string> | null,
	{ local, cliFileExists = false }: TDisk = {},
): {
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
		dotenv.mockLocalEnvFile(local ?? null);
		readFile = dotenv.mockEnvFileRead;
		jest.doMock("node:fs", () => require("../__mocks__/mock-fs"));
		require("../__mocks__/mock-fs").mockCliFileExists(cliFileExists);
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

	it("writes the PostHog token and host into the build, with the local file winning", () => {
		const token = faker.string.alphanumeric(20);
		const host = faker.internet.url();

		const { config } = loadConfig(
			{
				APP_BUNDLE_ID: generateBundleId(),
				POSTHOG_PROJECT_TOKEN: faker.string.alphanumeric(20),
				POSTHOG_HOST: host,
			},
			{ local: { POSTHOG_PROJECT_TOKEN: token } },
		);

		expect(config().extra).toMatchObject({
			posthogProjectToken: token,
			posthogHost: host,
		});
	});

	it("never writes the CLI keys into the build", () => {
		const cliKeys = generateCliKeys();

		const { config } = loadConfig(
			{ APP_BUNDLE_ID: generateBundleId() },
			{ local: cliKeys, cliFileExists: true },
		);

		expect(JSON.stringify(config())).not.toContain(cliKeys.POSTHOG_CLI_API_KEY);
	});

	it.each([
		{ present: "POSTHOG_CLI_PROJECT_ID", absent: "POSTHOG_CLI_API_KEY" },
		{ present: "POSTHOG_CLI_API_KEY", absent: "POSTHOG_CLI_PROJECT_ID" },
	] as const)(
		"stops the build when $present is set without $absent",
		({ present, absent }) => {
			const { config } = loadConfig({
				APP_BUNDLE_ID: generateBundleId(),
				[present]: generateCliKeys()[present],
			});

			expect(config).toThrow(`${absent}: is not set`);
		},
	);

	it("uploads the symbols when both CLI keys are set and their file exists", () => {
		const { config } = loadConfig(
			{ APP_BUNDLE_ID: generateBundleId() },
			{ local: generateCliKeys(), cliFileExists: true },
		);

		expect(config().plugins).toContainEqual([
			"posthog-react-native/expo",
			{ uploadNativeSymbols: true, dotenvFile: ".env.dev.local" },
		]);
	});

	it.each([
		{ label: "the CLI keys are unset", keys: {}, cliFileExists: true },
		{
			label: "their file is missing",
			keys: generateCliKeys(),
			cliFileExists: false,
		},
	])("skips the upload when $label", ({ keys, cliFileExists }) => {
		const { config } = loadConfig(
			{ APP_BUNDLE_ID: generateBundleId(), ...keys },
			{ cliFileExists },
		);

		expect(JSON.stringify(config().plugins)).not.toContain(
			"posthog-react-native/expo",
		);
	});
});
