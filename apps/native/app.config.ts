import path from "node:path";
import dotenv from "dotenv";
import type { ExpoConfig } from "expo/config";
import { z } from "zod";
import palette from "./src/shared/theme/lib/palette.json";

// `APP_ENV` picks the build: `dev` on a laptop, `stg` and `prd` for the
// builds that ship. Each reads its own `.env.<APP_ENV>`, which is gitignored;
// `.env.dev.example` is the committed template.
const appEnv = z
	.enum(["dev", "stg", "prd"])
	.default("dev")
	.parse(process.env.APP_ENV || undefined);

// The build's values come from its file alone, never the shell: a variable
// left set from another build must never give this one its bundle ID. dotenv
// writes into `fromFile` instead of `process.env`, which it would not read
// past, and the shell is never consulted.
const fromFile: Record<string, string> = {};
const loaded = dotenv.config({
	path: path.resolve(__dirname, `.env.${appEnv}`),
	processEnv: fromFile,
	quiet: true,
});
// Without its file a build would fall back to whatever the shell holds.
if (loaded.error) {
	throw new Error(
		`.env.${appEnv} not found in apps/native. Create it from .env.dev.example with the ${appEnv} values.`,
	);
}
const source: Record<string, string | undefined> = fromFile;

const schema = z.object({
	APP_BUNDLE_ID: z
		.string()
		.trim()
		.regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/, "is not a bundle ID"),
});

// Fails the build with the variable's name, never its value. Whether the
// variable is there decides the wording; zod does not keep the input.
const parsed = schema.safeParse(source);
if (!parsed.success) {
	const problems = parsed.error.issues.map((issue) => {
		const name = String(issue.path[0]);
		const missing = (source[name] ?? "").trim() === "";
		return `  ${name}: ${missing ? "is not set" : issue.message}`;
	});
	throw new Error(
		`Invalid .env.${appEnv}:\n${problems.join("\n")}\nCopy .env.${appEnv}.example to .env.${appEnv}.`,
	);
}
const env = parsed.data;

const NAMES = { dev: "Medusa Dev", stg: "Medusa Stg", prd: "Medusa" } as const;

// The brand colour behind the Android icon and the splash. Expo loads this
// file on its own, so it reads the palette's JSON rather than `palette.ts`.
const BRAND = palette.brand;

const config: ExpoConfig = {
	name: NAMES[appEnv],
	slug: "medusa",
	scheme: "medusa",
	version: "1.0.0",
	orientation: "portrait",
	userInterfaceStyle: "light",
	platforms: ["ios", "android"],
	icon: "./assets/icon.png",
	ios: {
		bundleIdentifier: env.APP_BUNDLE_ID,
		infoPlist: {
			// The app uses only the encryption iOS provides, which is exempt;
			// saying so here answers TestFlight's question on every upload.
			ITSAppUsesNonExemptEncryption: false,
		},
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
