import { Image, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { kitIcons } from "@vedic-patro/ui/classes";
import { neutral } from "@vedic-patro/design-tokens";
import { LEGAL_SITE } from "@vedic-patro/domain/legal-copy";
import { useChapterStill, useChapterTip } from "@vedic-patro/features/learn";
import type { ChapterStillProps, ChapterTipProps } from "../contract";

function CloseMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {kitIcons.x.map(([, attrs], index) => (
        <Path key={index} d={String(attrs.d)} stroke={neutral.white} strokeWidth={2} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

/** Mount with `key={src}` so a failed picture does not hide the next one. */
export function ChapterStill({ src, captionKey, onClose }: ChapterStillProps) {
  const still = useChapterStill(src, captionKey);
  if (!still.visible) return null;
  return (
    <Box className="absolute left-3 top-[5.25rem] z-10 w-[min(240px,45%)] overflow-hidden rounded-xl border border-white/20 bg-black/80">
      <Pressable
        onPress={onClose}
        label={still.closeLabel}
        className="absolute right-1 top-1 z-10 h-6 w-6 items-center justify-center rounded-full bg-black/60"
      >
        <CloseMark size={12} />
      </Pressable>
      <Image
        source={{ uri: `${LEGAL_SITE}/${src}` }}
        onError={still.onError}
        resizeMode="contain"
        style={{ width: "100%", aspectRatio: 1 }}
      />
      {still.caption ? <Text className="px-2 py-1.5 text-xs leading-snug text-white/70">{still.caption}</Text> : null}
    </Box>
  );
}

/** Mount with `key={tipKey}`. The tip retires itself; the key arms the next one. */
export function ChapterTip({ tipKey }: ChapterTipProps) {
  const tip = useChapterTip(tipKey);
  if (!tip) return null;
  return (
    <View pointerEvents="none" className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5">
      <Text className="text-xs font-semibold text-white/85">{tip}</Text>
    </View>
  );
}
