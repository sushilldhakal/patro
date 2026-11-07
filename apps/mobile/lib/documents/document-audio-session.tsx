import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useIsFocused } from "expo-router";
import type { Shloka } from "@/lib/documents/api";
import { suktaTracksFrom } from "@vedic-patro/features/documents";
import { useDocumentAudio, type DocumentAudio } from "@/lib/documents/use-document-audio";

/**
 * One document recording for the whole app, like a music app's player: it keeps sounding when the
 * reader goes to another page, and stops only when they pause it, close it, or quit the app.
 *
 * The player (`useDocumentAudio`) runs in `DocumentAudioHost` at the root, for whichever document page
 * last started audio — the session. A document page attaches with `useDocumentAudioSession`: while
 * nothing is playing it becomes the session; while another page's audio plays it waits, drawing its
 * verses as idle, and takes over the moment the reader presses play on it.
 */

export type SessionInputs = {
  /** Which page: the document slug and chapter. */
  key: string;
  /** Where the mini player takes the reader back to. */
  route: string;
  shlokas: Shloka[];
  fullAudioUrl: string | null | undefined;
  documentTitle?: string;
  complete: boolean;
  chapterTitle?: string;
};

/** The player as a page sees it. `foreign`: another page's audio is playing, so this page's bar steps aside. */
export type SessionAudio = DocumentAudio & { foreign: boolean };

type Engine = { key: string; audio: DocumentAudio };

let session: SessionInputs | null = null;
let engine: Engine | null = null;
/** An action pressed on a page that was not the session yet: run once that page's player is up. */
let pending: { key: string; run: (audio: DocumentAudio) => void } | null = null;
const sessionListeners = new Set<() => void>();
const engineListeners = new Set<() => void>();

function setSession(next: SessionInputs | null) {
  session = next;
  sessionListeners.forEach((l) => l());
}
function setEngine(next: Engine | null) {
  engine = next;
  engineListeners.forEach((l) => l());
}
const subscribeSession = (l: () => void) => {
  sessionListeners.add(l);
  return () => sessionListeners.delete(l);
};
const subscribeEngine = (l: () => void) => {
  engineListeners.add(l);
  return () => engineListeners.delete(l);
};
const getSession = () => session;
const getEngine = () => engine;

export function useAudioSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}
export function useAudioEngine() {
  return useSyncExternalStore(subscribeEngine, getEngine, getEngine);
}

/** Close the player: stop, drop the lock-screen controls (the host's cleanup does both), forget the session. */
export function closeDocumentAudio() {
  pending = null;
  setSession(null);
}

const isSounding = (audio: DocumentAudio | undefined) => Boolean(audio && (audio.activePlaying || audio.full.playing || audio.verse.playing));

/** Mounted once at the root. A new session remounts the player, so nothing of the last document's state is carried over. */
export function DocumentAudioHost() {
  const current = useAudioSession();
  useEffect(() => {
    if (!current) setEngine(null);
  }, [current]);
  return current ? <SessionEngine key={current.key} inputs={current} /> : null;
}

function SessionEngine({ inputs }: { inputs: SessionInputs }) {
  const audio = useDocumentAudio(inputs.shlokas, inputs.fullAudioUrl, inputs.documentTitle, inputs.complete, inputs.chapterTitle);
  // Every render (the status ticks a few times a second) hands the pages the fresh player.
  useLayoutEffect(() => {
    setEngine({ key: inputs.key, audio });
    if (pending?.key === inputs.key) {
      const { run } = pending;
      pending = null;
      run(audio);
    }
  });
  return null;
}

/**
 * A document page's handle on the shared player. Same shape as `useDocumentAudio`, so the reader and
 * its bar do not change.
 */
export function useDocumentAudioSession(inputs: SessionInputs): SessionAudio {
  const current = useAudioSession();
  const live = useAudioEngine();
  const owner = current?.key === inputs.key;
  const sounding = isSounding(live?.audio);
  // Only the page on screen may claim the player. A chapter opened from its document leaves the
  // document page mounted underneath; when both claimed it they took it from each other forever.
  const focused = useIsFocused();
  const { key, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle, route } = inputs;

  useEffect(() => {
    if (!focused) return;
    if (!current || (!owner && !sounding)) {
      // Nothing playing (or the other page's audio is paused): this page is the session now.
      setSession({ key, route, shlokas, fullAudioUrl, documentTitle, complete, chapterTitle });
      return;
    }
    if (!owner) return;
    // More verses loaded, or the titles arrived. Coming back to the page with only its first page of
    // verses must not shrink the playing list: a shorter list rebuilds the queue and stops the verse.
    const grew = shlokas !== current.shlokas && shlokas.length >= current.shlokas.length;
    const changed = fullAudioUrl !== current.fullAudioUrl || complete !== current.complete || documentTitle !== current.documentTitle || chapterTitle !== current.chapterTitle;
    if (grew || changed) {
      setSession({ ...current, shlokas: grew ? shlokas : current.shlokas, fullAudioUrl, complete, documentTitle, chapterTitle, route });
    }
  }, [focused, current, owner, sounding, key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle]);

  const [openMeaningIds, setOpenMeaningIds] = useState<ReadonlySet<number>>(() => new Set());
  const idle = useMemo<SessionAudio>(() => {
    const takeOver = (run: (audio: DocumentAudio) => void) => {
      pending = { key, run };
      setSession({ key, route, shlokas, fullAudioUrl, documentTitle, complete, chapterTitle });
    };
    const playable = new Set(shlokas.filter((s) => s.audio_url).map((s) => s.id));
    return {
      foreign: true,
      missingIds: new Set<number>(),
      // Until this page is the session its clips are not checked: show every play button it names.
      verifiedIds: playable,
      mode: null,
      activeId: null,
      activeProgress: 0,
      activePlaying: false,
      activeShloka: null,
      openMeaningIds,
      toggleMeaning: (id: number) =>
        setOpenMeaningIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleVerse: (id: number) => takeOver((a) => a.playVerse(id)),
      playVerse: (id: number) => takeOver((a) => a.playVerse(id)),
      nextVerse: () => {},
      prevVerse: () => {},
      hasNext: false,
      hasPrev: false,
      verse: { playing: false, currentTime: 0, duration: 0 },
      full: { playing: false, currentTime: 0, duration: 0, available: Boolean(fullAudioUrl) },
      hasSuktaAudio: false,
      suktaNumber: null,
      // A Rigveda sukta heading plays its file even before this page owns the player.
      sukta: {
        has: (n: number) => !fullAudioUrl && suktaTracksFrom(shlokas).some((track) => track.sukta === n),
        playing: null,
        toggle: (n: number) => takeOver((a) => a.sukta.toggle(n)),
      },
      startFull: () => takeOver((a) => a.startFull()),
      startPlayThrough: () => takeOver((a) => a.startPlayThrough()),
      canPlayThrough: false,
      toggleFull: () => takeOver((a) => a.toggleFull()),
      seekFull: () => {},
      playFullAt: (id: number) => takeOver((a) => a.playFullAt(id)),
      switchToFull: () => {},
      hasVerseClips: playable.size > 0,
    };
  }, [key, route, shlokas, fullAudioUrl, documentTitle, complete, chapterTitle, openMeaningIds]);

  if (owner && live?.key === key) return { ...live.audio, foreign: false };
  // Waiting on another page's audio only while it actually sounds; otherwise this page takes over next frame.
  return sounding && !owner ? idle : { ...idle, foreign: false };
}
