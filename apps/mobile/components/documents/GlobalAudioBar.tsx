import { usePathname, useRouter } from "expo-router";
import { haptics } from "@vedic-patro/ui/motion";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { closeDocumentAudio, useAudioEngine, useAudioSession } from "@/lib/documents/document-audio-session";
import { useLocale } from "@/lib/i18n";

/**
 * The mini player: a document's recording keeps playing on every other page. It is the same bar the
 * document page shows — play / pause, the seek slider (or previous / next for verses) — plus an X to
 * stop it, and its title taps back to the text. Hidden on the page the recording belongs to (that page
 * shows its own bar) and once the player is closed.
 */
export function GlobalAudioBar() {
  const session = useAudioSession();
  const engine = useAudioEngine();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  const audio = engine && session && engine.key === session.key ? engine.audio : null;
  if (!audio || !session || audio.mode == null || pathname === session.route) return null;

  return (
    <PlaybackBar
      audio={audio}
      documentTitle={session.documentTitle ?? session.chapterTitle ?? ""}
      open={{ hint: t("documents.open_player"), onPress: () => router.push(session.route as never) }}
      close={{
        label: t("documents.close_player"),
        onPress: () => {
          haptics.tick();
          closeDocumentAudio();
        },
      }}
    />
  );
}
