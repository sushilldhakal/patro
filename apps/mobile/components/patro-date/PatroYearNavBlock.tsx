import { View } from "react-native";
import { PatroYearBrowseNav, type PatroYearBrowseNavProps } from "./PatroYearBrowseNav";

type Props = PatroYearBrowseNavProps & {
  className?: string;
};

/** Page spacing wrapper — web `PatroYearNavBlock` (holidays, graha year pages). */
export function PatroYearNavBlock({ className, ...navProps }: Props) {
  return (
    <View className={className ?? "mb-4"}>
      <PatroYearBrowseNav {...navProps} />
    </View>
  );
}
