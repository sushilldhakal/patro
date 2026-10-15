import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { cardClass } from "../classes";
import type { CardProps } from "../contract";

export function Card({ size = "default", className, nativeClassName, children, testID }: CardProps) {
  return (
    <View className={cn(cardClass[size], className, nativeClassName)} testID={testID}>
      {children}
    </View>
  );
}
