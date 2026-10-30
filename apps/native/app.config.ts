import path from "node:path";
import dotenv from "dotenv";
import type { ExpoConfig } from "expo/config";
import { z } from "zod";

// `APP_ENV` picks the build: `dev` on a laptop, `stg` and `prd` for the
// builds that ship. Each reads its own `.env.<APP_ENV>`, which is gitignored;
// `.env.dev.example` is the committed template.
const appEnv = z
	.enum(["dev", "stg", "prd"])
	.default("dev")
	.parse(process.env.APP_ENV || undefined);
dotenv.config({ path: path.resolve(__dirname, `.env.${appEnv}`), quiet: true });

const schema = z.object({
	APP_BUNDLE_ID: z
		.string()
		.trim()
		.regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/, "is not a bundle ID"),
});

// Fails the build with the variable's name, never its value.
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
	const problems = parsed.error.issues.map(
		(issue) =>
			`  ${issue.path.join(".")}: ${issue.input === undefined ? "is not set" : issue.message}`,
	);
	throw new Error(
		`Invalid .env.${appEnv}:\n${problems.join("\n")}\nCopy .env.${appEnv}.example to .env.${appEnv}.`,
	);
}
const env = parsed.data;

const NAMES = { dev: "Medusa Dev", stg: "Medusa Stg", prd: "Medusa" } as const;

// The brand colour behind the Android icon and the splash: `palette.brand`.
// Expo loads this file on its own and cannot import the palette, which is
// TypeScript, so the value is repeated here and nowhere else.
// eslint-disable-next-line no-restricted-syntax
const BRAND = "#4F46E5";

const config: ExpoConfig = {
	name: NAMES[appEnv],
	slug: "medusa",
	scheme: "medusa",
	version: "1.0.0",
	orientation: "portrait",
	userInterfaceStyle: "automatic",
	platforms: ["ios", "android"],
	icon: "./assets/icon.png",
	ios: {
		bundleIdentifier: env.APP_BUNDLE_ID,
	},
	android: {
		package: env.APP_BUNDLE_ID,
		adaptiveIcon: {
			foregroundImage: "./assets/adaptive-icon.png",
			monochromeImage: "./assets/adaptive-icon-monochrome.png",
			backgroundColor: BRAND,
		},
	},
	experiments: {
		typedRoutes: true,
	},
	plugins: [
		"expo-router",
		"expo-status-bar",
		[
			"expo-splash-screen",
			{
				image: "./assets/splash-icon.png",
				imageWidth: 200,
				resizeMode: "contain",
				backgroundColor: BRAND,
			},
		],
		"expo-localization",
	],
	extra: {
		appEnv,
	},
};

export default config;
