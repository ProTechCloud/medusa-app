import { Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

type TInfoRowProps = {
	label: string;
	value: string;
	testID?: string;
};

/** One fact: its label on the left, its value on the right. */
export function InfoRow({ label, value, testID }: TInfoRowProps) {
	const { colors, fontSize } = useTheme();

	return (
		<View
			testID={testID}
			style={{ flexDirection: "row", justifyContent: "space-between" }}
		>
			<Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>
				{label}
			</Text>
			<Text
				selectable
				style={{ color: colors.text, fontSize: fontSize.md, flexShrink: 1 }}
			>
				{value}
			</Text>
		</View>
	);
}
