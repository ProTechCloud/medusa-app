import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Card } from "@/shared/components/card";
import { ListRow } from "@/shared/components/list-row";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ScreenContainer } from "@/shared/components/screen-container";
import { colors, fontSizes, spacing } from "@/shared/theme";
import { useApiVersion } from "./hooks/use-api-version";

/** Home: what the stg API says is running. */
export function HomeScreen() {
	const { t } = useTranslation("home");
	const { status, version, check } = useApiVersion();

	return (
		<ScreenContainer title={t("title")} testID="home-screen" insideTabs>
			<Card title={t("api.heading")}>
				{status === "checking" && (
					<View testID="home-api-checking" style={styles.checking}>
						<ActivityIndicator color={colors.primary} />
						<Text style={styles.muted}>{t("api.checking")}</Text>
					</View>
				)}

				{status === "ok" && version && (
					<View testID="home-api-version" style={styles.version}>
						<ListRow label={t("api.service")} value={version.service} />
						<ListRow label={t("api.version")} value={version.version} />
						<ListRow
							label={t("api.commit")}
							value={version.commit.slice(0, 7)}
						/>
						<ListRow label={t("api.environment")} value={version.environment} />
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
			</Card>
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
