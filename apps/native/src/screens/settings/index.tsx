import * as Application from "expo-application";
import { useTranslation } from "react-i18next";
import { appConfig } from "@/config/app-config";
import { InfoCard } from "@/shared/components/info-card";
import { InfoRow } from "@/shared/components/info-row";
import { ScreenContainer } from "@/shared/components/screen-container";

/** Settings: which build of the app this is. */
export function SettingsScreen() {
	const { t } = useTranslation("settings");
	const unknown = t("about.unknown");

	return (
		<ScreenContainer title={t("title")} insideTabs>
			<InfoCard title={t("about.heading")}>
				<InfoRow
					testID="settings-version"
					label={t("about.version")}
					value={Application.nativeApplicationVersion ?? unknown}
				/>
				<InfoRow
					testID="settings-build"
					label={t("about.build")}
					value={Application.nativeBuildVersion ?? unknown}
				/>
				<InfoRow
					testID="settings-environment"
					label={t("about.environment")}
					value={appConfig.appEnv}
				/>
			</InfoCard>
		</ScreenContainer>
	);
}
