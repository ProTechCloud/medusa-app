import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "@/shared/theme";

type TListRowProps = {
	label: string;
	value: string;
	testID?: string;
};

/** One fact in a list: its label on the left, its value on the right. */
export function ListRow({ label, value, testID }: TListRowProps) {
	return (
		<View testID={testID} style={styles.row}>
			<Text style={styles.label}>{label}</Text>
			<Text selectable style={styles.value}>
				{value}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", justifyContent: "space-between" },
	label: { color: colors.textMuted, fontSize: fontSizes.md },
	value: { color: colors.text, fontSize: fontSizes.md, flexShrink: 1 },
});
