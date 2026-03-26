import React, { type ComponentProps } from "react";
import { SymbolView, type SFSymbol } from "expo-symbols";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type MaterialIconName = NonNullable<
  ComponentProps<typeof MaterialIcons>["name"]
>;

type BaseProps = {
  color: string;
  size?: number;
};

/**
 * SF Symbol on iOS; Material icon fallback on Android/Web (expo-symbols native view is iOS-only).
 */
export function SymbolViewMaterial({
  sfName,
  materialName,
  color,
  size = 24,
}: BaseProps & { sfName: SFSymbol; materialName: MaterialIconName }) {
  return (
    <SymbolView
      name={sfName}
      fallback={<MaterialIcons name={materialName} size={size} color={color} />}
      tintColor={color}
      size={size}
    />
  );
}
