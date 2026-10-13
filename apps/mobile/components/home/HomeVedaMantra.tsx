import { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { VedaDaily } from "@/lib/documents/api";
import { useVedaDaily } from "@/lib/documents/use-veda-daily";
import { useLocale } from "@/lib/i18n";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { activeTokenAt, buildWordTrack } from "@vedic-patro/domain/word-tracking";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";
import { patroSecBand } from "@/lib/patro-classes";

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
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={playing ? t("panchanga.hora.pause") : t("home_veda.play")}
      className={cn(homeClasses.vedaPlay, "active:opacity-80")}
    >
      <Ionicons name={playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} />
    </Pressable>
  );
}

/** Today's Veda mantra — Sanskrit, meaning when there is one, audio, and a link to where it comes from. */
export function HomeVedaMantra({ dateAd }: { dateAd: string | undefined }) {
  const { t, pick, lang, digits } = useLocale();
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
    <View className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
      <View className={cn(patroSecBand, "flex-row items-center")}>
        <Text className={homeClasses.vedaTitle}>
          {t("home_veda.title")}
        </Text>
        {shloka.audio_url ? <PlayButton playing={status.playing} onToggle={toggleAudio} /> : null}
      </View>

      <View className={homeClasses.vedaBody}>
        <Text className={homeClasses.vedaSanskrit} selectable>
          {wordTrack.tokens.map((tok, i) =>
            i === activeToken ? (
              <Text key={i} className={homeClasses.vedaWord}>
                {tok}
              </Text>
            ) : (
              tok
            ),
          )}
        </Text>

        {meaning ? (
          <View className={homeClasses.vedaMeaning}>
            <Text className={homeClasses.vedaMeaningLabel}>{t("home_veda.meaning")}</Text>
            <Text className={homeClasses.vedaMeaningText}>{meaning}</Text>
          </View>
        ) : null}

        <View className={homeClasses.vedaFooter}>
          <Pressable onPress={openSource} accessibilityRole="link" hitSlop={8} className="active:opacity-70">
            <Text className={homeClasses.vedaMore}>
              {t("ui.home.read_more")}
            </Text>
          </Pressable>
          <Text className={homeClasses.vedaSource}>
            {sourceLine(data, l, digits)}
          </Text>
        </View>
      </View>
    </View>
  );
}
