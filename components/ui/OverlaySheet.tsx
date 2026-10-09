/**
 * A panel anchored to the bottom of a 3D canvas.
 *
 * The web puts these controls in a ~260px drawer floating beside the scene. At
 * phone width that is most of the canvas, and it covers the part of the picture
 * the controls are adjusting — so on this platform the panel takes the bottom
 * of the card instead, where the scene above it stays visible while a layer is
 * switched.
 *
 * Always dark glass, never themed: it floats over the sky's own black, so
 * light-mode tokens would come out near-invisible on it.
 *
 * Shared by the Learn playground and the Aakash Gochar sky, because both put
 * the same kind of thing in the same place and a second copy would drift.
 */

import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";

import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

export function OverlaySheet({
  title,
  onClose,
  maxHeight,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Cap against the canvas, not the window — the sheet belongs to the scene. */
  maxHeight: number;
  children: React.ReactNode;
}) {
  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-white/15"
      style={{ backgroundColor: "rgba(4, 7, 13, 0.95)", maxHeight }}
    >
      <View className="flex-row items-center justify-between px-3 pb-1 pt-2.5">
        <Text
          className="text-caption font-bold uppercase tracking-wide"
          style={[nepaliTextStyle(11), { color: "rgba(255,255,255,0.75)", fontSize: 15 }]}
        >
          {title}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="h-7 w-7 items-center justify-center rounded-full border border-white/20"
        >
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.75)" />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-3 pb-3.5">
        {children}
      </ScrollView>
    </View>
  );
}

/** A titled run of chips inside a sheet. */
export function SheetSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text
        className="text-caption font-bold uppercase tracking-wide"
        style={[nepaliTextStyle(10), { color: "rgba(255,255,255,0.55)", fontSize: 15 }]}
      >
        {heading}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">{children}</View>
    </View>
  );
}

export default OverlaySheet;
