import values from "./palette.json";

/**
 * Every colour value in the app, from `palette.json`. The values live in
 * JSON so `app.config.ts`, which Expo loads on its own, can read the brand
 * colour from the same file. Nothing else writes a hex or `rgb()` literal:
 * `no-restricted-syntax` in `eslint.config.mjs` reports one anywhere else in
 * `apps/native`. Screens use the roles in `@/shared/theme`, never these names.
 */
export const palette: Readonly<typeof values> = values;
