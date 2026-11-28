import { Children, type ReactNode } from "react";
import { View } from "react-native";
import { useBreakpoint } from "@/lib/responsive";

/**
 * Cards side by side in equal columns on a big screen (iPad, Android tablet, an open Duo), so they
 * don't stretch across the whole width; on a phone they stack as before. Goes by the window width,
 * so a narrowed iPad window (Split View, Stage Manager) stacks too.
 */
export function WideRow({ children, gap = "gap-4" }: { children: ReactNode; gap?: string }) {
  const { isTablet } = useBreakpoint();
  if (!isTablet) return <>{children}</>;
  const items = Children.toArray(children);
  return (
    <View className={`flex-row items-start ${gap}`}>
      {items.map((child, i) => (
        <View key={i} className="min-w-0 flex-1">
          {child}
        </View>
      ))}
    </View>
  );
}
