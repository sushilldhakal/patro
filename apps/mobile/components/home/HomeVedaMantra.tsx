import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useHomeVedaMantra } from "@vedic-patro/features/home";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";
import { patroSecBand } from "@/lib/patro-classes";

function PlayButton({
  playing,
  onToggle,
  label,
}: {
  playing: boolean;
  onToggle: () => void;
  label: { play: string; pause: string };
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={playing ? label.pause : label.play}
      className={cn(homeClasses.vedaPlay, "active:opacity-80")}
    >
      <Ionicons name={playing ? "pause" : "play"} size={20} color={inkOn(colors.secondary)} />
    </Pressable>
  );
}

/** Today's Veda mantra — Sanskrit, meaning when there is one, audio, and a link to where it comes from. */
export function HomeVedaMantra({ dateAd }: { dateAd: string | undefined }) {
  const router = useRouter();
  const mantra = useHomeVedaMantra(dateAd, { offlineDays: 6 });
  const audioUrl = mantra.audioUrl;
  // 100 ms status ticks so the word highlight follows the chant smoothly.
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

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

  if (!mantra.ready) return null;

  const progress = status.playing && status.duration > 0 ? status.currentTime / status.duration : -1;
  const activeToken = mantra.activeTokenAt(progress);
  const { copy, meaning, read } = mantra;

  const openSource = () =>
    router.push({
      pathname: "/documents/[slug]/[chapter]",
      params: { slug: read.slug, chapter: read.chapter, verse: read.verse },
    } as never);

  return (
    <View className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
      <View className={cn(patroSecBand, "flex-row items-center")}>
        <Text className={homeClasses.vedaTitle}>
          {copy.title}
        </Text>
        {audioUrl ? <PlayButton playing={status.playing} onToggle={toggleAudio} label={copy} /> : null}
      </View>

      <View className={homeClasses.vedaBody}>
        <Text className={homeClasses.vedaSanskrit} selectable>
          {mantra.tokens.map((tok, i) =>
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
            <Text className={homeClasses.vedaMeaningLabel}>{copy.meaning}</Text>
            <Text className={homeClasses.vedaMeaningText}>{meaning}</Text>
          </View>
        ) : null}

        <View className={homeClasses.vedaFooter}>
          <Pressable onPress={openSource} accessibilityRole="link" hitSlop={8} className="active:opacity-70">
            <Text className={homeClasses.vedaMore}>
              {copy.readMore}
            </Text>
          </Pressable>
          <Text className={homeClasses.vedaSource}>
            {mantra.source}
          </Text>
        </View>
      </View>
    </View>
  );
}
