import { useEffect } from "react";
import { useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAudioAvailable, useHomeVedaMantra } from "@vedic-patro/features/home";
import { HomeVedaMantra as HomeVedaMantraView } from "@vedic-patro/ui/kit/shell";

/** Today's Veda mantra. The player stays here; the card is `@vedic-patro/ui/kit/shell`. */
export function HomeVedaMantra({ dateAd }: { dateAd: string | undefined }) {
  const router = useRouter();
  const mantra = useHomeVedaMantra(dateAd, { offlineDays: 6 });
  const audioUrl = mantra.audioUrl;
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  /* Some days' recordings were never uploaded; no button beats one that does nothing. */
  const hasRecording = useAudioAvailable(audioUrl);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  if (!mantra.ready) return null;

  const progress = status.playing && status.duration > 0 ? status.currentTime / status.duration : -1;
  const { copy, read } = mantra;
  return (
    <HomeVedaMantraView
      title={copy.title}
      tokens={mantra.tokens}
      activeToken={mantra.activeTokenAt(progress)}
      source={mantra.source}
      readMore={copy.readMore}
      playLabel={copy.play}
      pauseLabel={copy.pause}
      playing={status.playing}
      onToggle={
        audioUrl && hasRecording
          ? () => {
              if (status.playing) {
                player.pause();
                return;
              }
              if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) {
                void player.seekTo(0);
              }
              player.play();
            }
          : undefined
      }
      onOpenPassage={() =>
        router.push({
          pathname: "/documents/[slug]/[chapter]",
          params: { slug: read.slug, chapter: read.chapter, verse: read.verse },
        } as never)
      }
    />
  );
}
