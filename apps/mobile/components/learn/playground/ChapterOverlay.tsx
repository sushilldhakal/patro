/**
 * A Learn diagram raised over the 3D scene by the running chapter.
 *
 * Some of what this tour has to teach is not a position in space. A week is
 * seven days because of the होरा cycle; a बिक्रम month is 29 to 32 days because
 * of a quantity plotted across a year; the pole star changes because of a
 * 25,772-year cone no orbit animation can run through. The Learn library
 * already holds a diagram for each of those, so a chapter names one
 * (`overlay: "hora-weekday-cycle"`) and gets it here instead of the scene
 * pretending to make a point it cannot.
 *
 * Dismissible: raising a panel is a suggestion about what to look at, not a
 * takeover — closing it leaves the scene running, and the next chapter's own
 * `overlay` decides afresh.
 */

import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { LEARN_DIAGRAMS } from "@/lib/learn/learn-diagrams";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

export function ChapterOverlay({ id, onClose }: { id: string; onClose: () => void }) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const Diagram = LEARN_DIAGRAMS[id];
  if (!Diagram) return null;
  return (
    <View
      className="absolute bottom-3 right-3 z-20 max-h-[70%] w-[min(340px,88%)] overflow-hidden rounded-xl border shadow-2xl"
      style={{ borderColor: colors.border, backgroundColor: colors.card }}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={pick("बन्द गर्नुहोस्", "Close")}
        className="absolute right-1.5 top-1.5 z-10 h-7 w-7 items-center justify-center rounded-full border active:opacity-70"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        <Ionicons name="close" size={14} color={colors.mutedForeground} />
      </Pressable>
      {/* The diagrams bring their own scrubbers and controls, and several are
          taller than this panel — so it scrolls rather than clipping them. */}
      <ScrollView className="min-h-0" contentContainerStyle={{ padding: 10 }}>
        <Diagram />
      </ScrollView>
    </View>
  );
}

export default ChapterOverlay;
