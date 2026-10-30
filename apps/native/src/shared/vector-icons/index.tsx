import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { iconSizes } from "@/shared/theme";

export type TIconName = ComponentProps<typeof Ionicons>["name"];

type TIconProps = {
	name: TIconName;
	color: ColorValue;
	size?: number;
};

/**
 * The one icon set the app uses. Screens import `Icon`, never a set from
 * `@expo/vector-icons`, so changing the set is a change here.
 */
export function Icon({ name, color, size = iconSizes.md }: TIconProps) {
	return <Ionicons name={name} color={color} size={size} />;
}
