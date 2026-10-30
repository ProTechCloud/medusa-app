import "intl-pluralrules";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enHome from "./resources/en/home.json";
import enNavigation from "./resources/en/navigation.json";
import enSettings from "./resources/en/settings.json";

// One namespace per screen or area, so a screen loads only its own strings:
// `useTranslation("home")`, then `t("title")`. English is the only language
// for now and the fallback for every other.
const locale = Localization.getLocales()[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
	compatibilityJSON: "v4",
	lng: locale,
	fallbackLng: "en",
	resources: {
		en: {
			home: enHome,
			navigation: enNavigation,
			settings: enSettings,
		},
	},
	interpolation: {
		// React already escapes what it renders.
		escapeValue: false,
	},
});

export default i18n;
