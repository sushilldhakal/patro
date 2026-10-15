import { View } from "react-native";
import { BsNativeSelect as Select, type BsNativeSelectOption } from "@vedic-patro/ui/kit/shell";

export type { BsNativeSelectOption };
export type SelectOption = BsNativeSelectOption;

/** App callers pass a numeric min width. The drawing is `@vedic-patro/ui/kit/shell`. */
export function BsNativeSelect({
  minWidth,
  ...props
}: {
  value: number;
  options: BsNativeSelectOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  minWidth?: number;
  className?: string;
}) {
  return (
    <View style={minWidth != null ? { minWidth } : undefined}>
      <Select {...props} />
    </View>
  );
}
