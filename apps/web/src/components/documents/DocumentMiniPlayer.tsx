import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useLocale } from "@vedic-patro/i18n/react";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { closeDocumentAudio, useAudioEngine, useAudioSession } from "@/lib/document-audio-session";

/**
 * The mini player: a document's recording keeps playing on every other page. It is the same bar the
 * document page shows, plus an X to stop it, and its title goes back to the text. Hidden on the page
 * the recording belongs to (that page shows its own bar) and once the player is closed.
 */
export function DocumentMiniPlayer() {
  const session = useAudioSession();
  const engine = useAudioEngine();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useLocale();

  const playback = engine && session && engine.key === session.key ? engine.playback : null;
  if (!playback || !session || playback.mode == null || pathname === session.route) return null;
  const { player, versePlayer, fullAudio, mode, activeShloka } = playback;
  const documentTitle = session.documentTitle ?? session.chapterTitle ?? "";

  return (
    <>
      {/* Room at the foot of the page, so the bar never covers its last lines. */}
      <div className="h-18" aria-hidden="true" />
      <PlaybackBar
      mode={mode}
      hasFullRecording={Boolean(session.fullAudioUrl)}
      hasSuktaAudio={playback.hasSuktaAudio}
      suktaNumber={mode === "full" ? playback.suktaNumber : null}
      suktaLabel={mode === "full" ? playback.suktaLabel : null}
      documentTitle={documentTitle}
      chapterTitle={session.documentTitle ? session.chapterTitle : undefined}
      onStartFull={playback.startFull}
      fullPlaying={fullAudio.playing}
      fullCurrentTime={fullAudio.currentTime}
      fullDuration={fullAudio.duration}
      onToggleFull={fullAudio.toggle}
      onSeekFull={fullAudio.seek}
      hasPrevFull={playback.hasPrevFull}
      hasNextFull={playback.hasNextFull}
      onPrevFull={playback.prevFull}
      onNextFull={playback.nextFull}
      activeShloka={activeShloka}
      versePlaying={mode === "verse" && player.playing}
      verseCurrentTime={player.currentTime}
      verseDuration={player.duration}
      hasNext={player.hasNext}
      hasPrev={player.hasPrev}
      onToggleVerse={() => activeShloka && versePlayer.toggle(activeShloka.id)}
      onNext={versePlayer.next}
      onPrev={versePlayer.prev}
      onSwitchToFull={playback.switchToFull}
      open={{ hint: t("documents.open_player"), onPress: () => void navigate({ to: session.route as never }) }}
      close={{ label: t("documents.close_player"), onPress: closeDocumentAudio }}
    />
    </>
  );
}
