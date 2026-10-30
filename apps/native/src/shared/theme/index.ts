import { useColorScheme } from "react-native";
import { palette } from "./lib/palette";

/** What a colour is for. A screen asks for `text` or `danger`, never a hex. */
export type TColorRoles = {
	background: string;
	surface: string;
	border: string;
	text: string;
	textMuted: string;
	primary: string;
	onPrimary: string;
	danger: string;
};

const light: TColorRoles = {
	background: palette.gray50,
	surface: palette.white,
	border: palette.gray200,
	text: palette.gray900,
	textMuted: palette.gray500,
	primary: palette.brand,
	onPrimary: palette.white,
	danger: palette.red600,
};

const dark: TColorRoles = {
	background: palette.gray950,
	surface: palette.gray900,
	border: palette.gray800,
	text: palette.gray50,
	textMuted: palette.gray400,
	primary: palette.brandDark,
	onPrimary: palette.black,
	danger: palette.red400,
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

const fontSize = { sm: 13, md: 16, lg: 20, xl: 28 } as const;

const radius = { sm: 6, md: 12, full: 999 } as const;

export type TTheme = {
	colors: TColorRoles;
	spacing: typeof spacing;
	fontSize: typeof fontSize;
	radius: typeof radius;
};

/** The theme for the device's light or dark setting. */
export function useTheme(): TTheme {
	const colors = useColorScheme() === "dark" ? dark : light;
	return { colors, spacing, fontSize, radius };
}
