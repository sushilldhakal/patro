import { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { VedaDaily } from "@/lib/documents/api";
import { useVedaDaily } from "@/lib/documents/use-veda-daily";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { activeTokenAt, buildWordTrack } from "@/lib/documents/word-tracking";

function sourceLine(data: VedaDaily, lang: "ne" | "en", digits: (v: string | number) => string): string {
  const ne = lang === "ne";
  const parts = data.source_parts.map((part) => {
    const label = (ne ? part.label_ne : part.label_en) ?? "";
    // Chapter titles carry their own number ("मण्डल 3"); the others pair a label with a value.
    return part.value == null ? label.replace(/\d+/g, (m) => digits(m)) : `${label} ${digits(part.value)}`;
  });
  return [ne ? data.veda.name_ne : data.veda.name_en, ...parts].join(" » ");
}

function PlayButton({
  playing,
  onToggle,
}: {
  playing: boolean;
  onToggle: () => void;
}) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={playing ? pick("रोक्नुहोस्", "Pause") : pick("सुन्नुहोस्", "Play")}
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
      style={{ backgroundColor: colors.secondary }}
    >
      <Ionicons name={playing ? "pause" : "play"} size={22} color={inkOn(colors.secondary)} />
    </Pressable>
  );
}

/** Today's Veda mantra — Sanskrit, meaning when there is one, audio, and a link to where it comes from. */
export function HomeVedaMantra({ dateAd }: { dateAd: string | undefined }) {
  const { pick, lang, digits } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { data } = useVedaDaily(dateAd);
  const audioUrl = data?.shloka.audio_url ?? null;
  // 100 ms status ticks so the word highlight follows the chant smoothly.
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const wordTrack = useMemo(() => buildWordTrack(data?.shloka.sanskrit ?? ""), [data?.shloka.sanskrit]);

  useEffect(() => {
    // Recitation should be audible with the iPhone's silent switch on.
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  const toggleAudio = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) {
      void player.seekTo(0);
    }
    player.play();
  };

  if (!data) return null;

  const progress = status.playing && status.duration > 0 ? status.currentTime / status.duration : -1;
  const activeToken = activeTokenAt(wordTrack, progress);

  const l = lang === "en" ? "en" : "ne";
  const { shloka } = data;
  const meaning = (l === "ne" ? shloka.meaning_ne : shloka.meaning_en) ?? shloka.meaning_en ?? shloka.meaning_ne;

  const openSource = () =>
    router.push({
      pathname: "/documents/[slug]/[chapter]",
      params: { slug: data.read_slug, chapter: String(data.read_chapter), verse: data.read_verse },
    } as never);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-body min-w-0 flex-1 font-bold" style={[nepaliTextStyle(16), { color: colors.secondary }]}>
          {pick("आजको वेद मन्त्र", "Today's Veda mantra")}
        </Text>
        {shloka.audio_url ? <PlayButton playing={status.playing} onToggle={toggleAudio} /> : null}
      </View>

      <Text className="text-foreground" style={nepaliTextStyle(21)} selectable>
        {wordTrack.tokens.map((tok, i) =>
          i === activeToken ? (
            <Text key={i} style={{ backgroundColor: "rgba(250,204,21,0.45)" }}>
              {tok}
            </Text>
          ) : (
            tok
          ),
        )}
      </Text>

      {meaning ? (
        <View className="gap-1">
          <Text className="text-caption font-bold text-muted-foreground">{pick("अर्थ", "Meaning")}</Text>
          <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
            {meaning}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-end justify-between gap-3">
        <Pressable onPress={openSource} accessibilityRole="link" hitSlop={8} className="active:opacity-70">
          <Text className="text-body font-semibold" style={[nepaliTextStyle(14), { color: colors.secondary }]}>
            {pick("थप पढ्नुहोस् →", "Read more →")}
          </Text>
        </Pressable>
        <Text className="text-caption min-w-0 flex-1 text-right text-muted-foreground" style={nepaliTextStyle(11)}>
          {sourceLine(data, l, digits)}
        </Text>
      </View>
    </Card>
  );
}
