/**
 * The hint and zoom buttons under a zoomable study — the website's `ZoomBar`.
 * They sit below the drawing, never over it, so no label is covered.
 */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useStudyInk } from "@/components/learn/study/study-ink";
import type { useSvgZoom } from "./use-svg-zoom";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function ZoomBar({
  zoom,
  hint,
  labels,
  extra = [],
}: {
  zoom: ReturnType<typeof useSvgZoom>;
  hint: string;
  labels: { in: string; out: string; reset: string };
  extra?: { label: string; icon: IconName | ReactNode; onClick: () => void }[];
}) {
  const ink = useStudyInk();
  const buttons: { label: string; icon: IconName | ReactNode; onClick: () => void }[] = [
    { label: labels.in, icon: "add", onClick: zoom.zoomIn },
    { label: labels.out, icon: "remove", onClick: zoom.zoomOut },
    ...(zoom.scale > 1 ? [{ label: labels.reset, icon: "refresh" as IconName, onClick: zoom.reset }] : []),
    ...extra,
  ];
  return (
    <View className="mt-1 flex-row items-center justify-between gap-2">
      <Text className="flex-1 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
        {hint}
      </Text>
      <View className="shrink-0 flex-row gap-1.5">
        {buttons.map((b) => (
          <Pressable
            key={b.label}
            onPress={b.onClick}
            accessibilityRole="button"
            accessibilityLabel={b.label}
            className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card/75 active:opacity-70"
          >
            {typeof b.icon === "string" ? <Ionicons name={b.icon as IconName} size={15} color={ink.ink} /> : b.icon}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
