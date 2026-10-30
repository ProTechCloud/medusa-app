/**
 * Every colour value in the app. Nothing else writes a hex or `rgb()`
 * literal: `no-restricted-syntax` in `eslint.config.mjs` reports one anywhere
 * else in `apps/native`. Screens use the roles in `@/shared/theme`, never
 * these names.
 */
export const palette = {
	brand: "#4F46E5",
	brandDark: "#818CF8",
	white: "#FFFFFF",
	black: "#000000",
	gray50: "#F9FAFB",
	gray200: "#E5E7EB",
	gray500: "#6B7280",
	gray400: "#9CA3AF",
	gray800: "#1F2937",
	gray900: "#111827",
	gray950: "#030712",
	red600: "#DC2626",
	red400: "#F87171",
} as const;
