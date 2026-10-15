import { ScrollView } from "react-native";
import { Box, Icon, Pressable } from "@vedic-patro/ui";
import { kitIcons } from "@vedic-patro/ui/classes";
import { cn } from "@vedic-patro/domain/utils";
import { useChapterOverlay } from "@vedic-patro/features/learn";
import type { ChapterOverlayProps } from "../contract";

/** A chapter diagram over the scene. Scrolls when the diagram is taller than the panel. */
export function ChapterOverlay({ onClose, className, children }: ChapterOverlayProps) {
  const { closeLabel } = useChapterOverlay();
  return (
    <Box
      className={cn(
        "absolute bottom-3 right-3 z-20 max-h-[70%] w-[min(420px,88%)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
        className,
      )}
    >
      <Pressable
        onPress={onClose}
        label={closeLabel}
        className="absolute right-1.5 top-1.5 z-10 h-7 w-7 items-center justify-center rounded-full border border-border bg-card"
      >
        <Icon node={kitIcons.x} size={14} tone="muted" />
      </Pressable>
      <ScrollView className="min-h-0" contentContainerClassName="p-2.5">
        {children}
      </ScrollView>
    </Box>
  );
}
