import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { BoxProps } from "../contract";

export function Box({ className, nativeClassName, children, label, testID, widthPercent }: BoxProps) {
  return (
    <View className={cn(className, nativeClassName)} accessibilityLabel={label} testID={testID} style={widthPercent === undefined ? undefined : { width: `${widthPercent}%` }}>
      {children}
    </View>
  );
}
