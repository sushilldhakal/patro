/**
 * A still picture a chapter holds up beside the scene, and the one-line tip.
 *
 * A simulation shows you where things *are*; some beats want a picture of the
 * actual sky, or of a figure the तारा make that the model has no way to draw.
 * The artwork lives in the web app's own `public/illustrations` (not bundled
 * into this app, since it is only ever shown in these four chapter beats), so
 * it loads from there over the network — same "missing file draws nothing"
 * contract as web: a picture that hasn't been made yet, or that fails to
 * load, just doesn't show.
 */

import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { LEGAL_SITE } from "@/lib/legal-copy";
import { chapterLabel } from "@/lib/learn/chapter-labels";

/**
 * Mount this with `key={src}` — the "did it load" flag has to start false
 * again for each new picture, and a fresh mount is how that is said without
 * an effect that resets state on a prop change.
 */
export function ChapterStill({
  src,
  captionKey,
  onClose,
}: {
  /** Path under the web app's `public/`, no leading slash. */
  src: string;
  captionKey?: string;
  onClose: () => void;
}) {
  const { lang } = useLocale();
  const colors = useThemeColors();
  const [broken, setBroken] = useState(false);

  if (!src || broken) return null;
  const caption = captionKey ? chapterLabel(captionKey, lang) : "";
  return (
    <View
      className="absolute left-3 top-[5.25rem] z-10 w-[min(240px,45%)] overflow-hidden rounded-xl border border-white/20 bg-black/80"
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={lang === "en" ? "Close" : "बन्द गर्नुहोस्"}
        className="absolute right-1 top-1 z-10 h-6 w-6 items-center justify-center rounded-full bg-black/60 active:opacity-70"
      >
        <Ionicons name="close" size={12} color="rgba(255,255,255,0.8)" />
      </Pressable>
      <Image
        source={{ uri: `${LEGAL_SITE}/${src}` }}
        onError={() => setBroken(true)}
        resizeMode="contain"
        style={{ width: "100%", aspectRatio: 1 }}
      />
      {caption ? (
        <Text className="text-caption px-2 py-1.5 text-white/70" style={nepaliTextStyle(11)}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The chapter's own hint, over the top of the scene. Mount with `key={tipKey}`.
 *
 * It retires itself after a few seconds rather than waiting for the next
 * keyframe to clear it — a tip is an aside, and one that sits there for the
 * rest of a chapter reads as a warning instead.
 */
export function ChapterTip({ tipKey }: { tipKey: string }) {
  const { lang } = useLocale();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), 6000);
    return () => clearTimeout(id);
  }, []);

  if (!tipKey || done) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5"
    >
      <Text className="text-caption font-semibold text-white/85" style={nepaliTextStyle(11)}>
        {chapterLabel(tipKey, lang)}
      </Text>
    </View>
  );
}
