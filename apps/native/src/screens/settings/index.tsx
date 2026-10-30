import * as Application from "expo-application";
import { useTranslation } from "react-i18next";
import { appConfig } from "@/config/app-config";
import { Card } from "@/shared/components/card";
import { ListRow } from "@/shared/components/list-row";
import { ScreenContainer } from "@/shared/components/screen-container";

/** Settings: which build of the app this is. */
export function SettingsScreen() {
	const { t } = useTranslation("settings");
	const unknown = t("about.unknown");

	return (
		<ScreenContainer title={t("title")} testID="settings-screen" insideTabs>
			<Card title={t("about.heading")}>
				<ListRow
					testID="settings-version"
					label={t("about.version")}
					value={Application.nativeApplicationVersion ?? unknown}
				/>
				<ListRow
					testID="settings-build"
					label={t("about.build")}
					value={Application.nativeBuildVersion ?? unknown}
				/>
				<ListRow
					testID="settings-environment"
					label={t("about.environment")}
					value={appConfig.appEnv}
				/>
			</Card>
		</ScreenContainer>
	);
}
