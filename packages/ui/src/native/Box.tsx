import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import type { BoxProps } from "../contract";

export function Box({ className, nativeClassName, children, label, testID }: BoxProps) {
  return (
    <View className={cn(className, nativeClassName)} accessibilityLabel={label} testID={testID}>
      {children}
    </View>
  );
}
