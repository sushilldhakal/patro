import { useEffect, useLayoutEffect, useRef } from "react";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { publishEngine, useAudioSession, type SessionInputs } from "@/lib/document-audio-session";

/** Mounted once at the root. A new session remounts the player, so nothing of the last document's state carries over. */
export function DocumentAudioHost() {
  const current = useAudioSession();
  useEffect(() => {
    if (!current) publishEngine(null);
  }, [current]);
  return current ? <SessionEngine key={current.key} inputs={current} /> : null;
}

function SessionEngine({ inputs }: { inputs: SessionInputs }) {
  const playback = useDocumentPlayback(inputs.shlokas, inputs.fullAudioUrl, inputs.complete);
  // Every render (the clock ticks a few times a second) hands the pages the fresh player.
  useLayoutEffect(() => {
    publishEngine({ key: inputs.key, playback });
  });
  // Closed, or another page took over: silence this one. A detached <audio> can keep playing.
  const latest = useRef(playback);
  useLayoutEffect(() => {
    latest.current = playback;
  });
  useEffect(
    () => () => {
      latest.current.player.stop();
      latest.current.fullAudio.pause();
    },
    [],
  );
  return playback.fullAudio.audioElement;
}

