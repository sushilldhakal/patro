import { View } from "react-native";
import { PatroMonthYearNav } from "./PatroMonthYearNav";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof PatroMonthYearNav> & {
  className?: string;
};

/** Page spacing wrapper for month + year browse chrome. */
export function PatroMonthYearNavBlock({ className, ...navProps }: Props) {
  return (
    <View className={className ?? "mb-4"}>
      <PatroMonthYearNav {...navProps} />
    </View>
  );
}
