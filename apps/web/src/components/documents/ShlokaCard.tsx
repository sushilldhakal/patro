import { playsFromFullRecording } from "@vedic-patro/features/documents";
import { ShlokaCard as Shared } from "@vedic-patro/ui/kit/jyotish";
import type { Shloka } from "@/lib/documents-api";
import type { ShlokaPlayerState } from "@/hooks/use-shloka-player";

type Props = {
  shloka: Shloka;
  player: ShlokaPlayerState;
  fullRecording?: { playing: boolean; toggleAt: (id: number) => void };
};

/** Binds the shared verse to the website player (scroll registration and clip time). */
export function ShlokaCard({ shloka, player, fullRecording }: Props) {
  const isActive = player.activeId === shloka.id;
  const playsFromFull = fullRecording != null && playsFromFullRecording(shloka, true);
  const isPlaying = isActive && (playsFromFull ? fullRecording.playing : player.playing);
  return (
    <Shared
      /* A verse whose recording is missing from storage loses its play button. */
      shloka={player.missingIds.has(shloka.id) ? { ...shloka, audio_url: null } : shloka}
      isActive={isActive}
      isPlaying={isPlaying}
      progress={player.progress}
      meaningOpen={player.openMeaningIds.has(shloka.id)}
      playsFromFull={playsFromFull}
      clip={{ currentTime: player.currentTime, duration: player.duration }}
      onPlay={() => (playsFromFull ? fullRecording.toggleAt(shloka.id) : player.toggle(shloka.id))}
      onToggleMeaning={() => player.toggleMeaning(shloka.id)}
      registerRef={(node) => player.registerItemRef(shloka.id, node as HTMLElement | null)}
    />
  );
}
