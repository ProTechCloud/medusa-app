import { palette } from "./lib/palette";

/**
 * The design tokens, as constants: components build their styles from them
 * with `StyleSheet.create` at module level. The app is light only
 * (`userInterfaceStyle: "light"` in `app.config.ts`).
 */

/** What a colour is for. A screen asks for `text` or `danger`, never a hex. */
export const colors = {
	background: palette.gray50,
	surface: palette.white,
	border: palette.gray200,
	text: palette.gray900,
	textMuted: palette.gray500,
	primary: palette.brand,
	onPrimary: palette.white,
	danger: palette.red600,
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const fontSizes = { sm: 13, md: 16, lg: 20, xl: 28 } as const;

export const radii = { sm: 6, md: 12, full: 999 } as const;

export const iconSizes = { sm: 16, md: 24, lg: 32 } as const;
