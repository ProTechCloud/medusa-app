import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { InfoCard } from "@/shared/components/info-card";
import { InfoRow } from "@/shared/components/info-row";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ScreenContainer } from "@/shared/components/screen-container";
import { colors, fontSizes, spacing } from "@/shared/theme";
import { useApiVersion } from "./hooks/use-api-version";

/** Home: what the stg API says is running. */
export function HomeScreen() {
	const { t } = useTranslation("home");
	const { status, version, check } = useApiVersion();

	return (
		<ScreenContainer title={t("title")} insideTabs>
			<InfoCard title={t("api.heading")}>
				{status === "checking" && (
					<View testID="home-api-checking" style={styles.checking}>
						<ActivityIndicator color={colors.primary} />
						<Text style={styles.muted}>{t("api.checking")}</Text>
					</View>
				)}

				{status === "ok" && version && (
					<View testID="home-api-version" style={styles.version}>
						<InfoRow label={t("api.service")} value={version.service} />
						<InfoRow label={t("api.version")} value={version.version} />
						<InfoRow
							label={t("api.commit")}
							value={version.commit.slice(0, 7)}
						/>
						<InfoRow label={t("api.environment")} value={version.environment} />
					</View>
				)}

				{status === "failed" && (
					<View testID="home-api-failed" style={styles.failed}>
						<Text style={styles.danger}>{t("api.failed")}</Text>
						<PrimaryButton
							label={t("api.tryAgain")}
							onPress={check}
							testID="home-api-try-again"
						/>
					</View>
				)}
			</InfoCard>
		</ScreenContainer>
	);
}

const styles = StyleSheet.create({
	checking: { gap: spacing.sm },
	version: { gap: spacing.xs },
	failed: { gap: spacing.md },
	muted: { color: colors.textMuted, fontSize: fontSizes.md },
	danger: { color: colors.danger, fontSize: fontSizes.md },
});
