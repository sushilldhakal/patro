import { Fragment, createElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { suktaTracksFrom } from "@vedic-patro/features/documents";
import type { Shloka } from "@/lib/documents-api";
import type { useDocumentPlayback } from "@/hooks/use-document-playback";
import { useAudioProbe } from "@/lib/audio-probe";

/**
 * One document recording for the whole website, like a music app's player: it keeps sounding when
 * the reader goes to another page, and stops only when they pause it or close it. The app does the
 * same (apps/mobile/lib/documents/document-audio-session.tsx).
 *
 * The player (`useDocumentPlayback`) runs in `DocumentAudioHost` (components/documents) at the root, for whichever document
 * page last started audio: the session. A document page attaches with `useDocumentPlaybackSession`.
 * While nothing is playing it becomes the session; while another page's audio plays it waits, its
 * verses idle, and takes over the moment the reader presses play on it.
 */

export type SessionInputs = {
  /** Which page: the document slug and chapter. */
  key: string;
  /** The page's path: the mini player shows everywhere else, and its title goes back here. */
  route: string;
  shlokas: Shloka[];
  fullAudioUrl: string | null | undefined;
  complete: boolean;
  documentTitle?: string;
  chapterTitle?: string;
  /** False while the page has no slug (it renders once more while the router leaves it): it claims nothing. */
  ready?: boolean;
};

export type Playback = ReturnType<typeof useDocumentPlayback>;
/** The player as a page sees it. `foreign`: another page's audio is playing, so this page's bar steps aside. */
export type SessionPlayback = Playback & { foreign: boolean };

type Engine = { key: string; playback: Playback };

let session: SessionInputs | null = null;
let engine: Engine | null = null;
/** An action pressed on a page that was not the session yet: run once that page's player is up. */
let pending: { key: string; run: (playback: Playback) => void } | null = null;
const sessionListeners = new Set<() => void>();
const engineListeners = new Set<() => void>();

function setSession(next: SessionInputs | null) {
  session = next;
  sessionListeners.forEach((l) => l());
}
/** The host hands over the player each render, and runs an action pressed before this page owned it. */
export function publishEngine(next: Engine | null) {
  engine = next;
  engineListeners.forEach((l) => l());
  if (next && pending?.key === next.key) {
    const { run } = pending;
    pending = null;
    run(next.playback);
  }
}
const subscribeSession = (l: () => void) => {
  sessionListeners.add(l);
  return () => {
    sessionListeners.delete(l);
  };
};
const subscribeEngine = (l: () => void) => {
  engineListeners.add(l);
  return () => {
    engineListeners.delete(l);
  };
};
const getSession = () => session;
const getEngine = () => engine;
const none = () => null;

export function useAudioSession() {
  return useSyncExternalStore(subscribeSession, getSession, none);
}
export function useAudioEngine() {
  return useSyncExternalStore(subscribeEngine, getEngine, none);
}

/** Close the player: stop it (the host's cleanup) and forget the session. */
export function closeDocumentAudio() {
  pending = null;
  setSession(null);
}

export const isSounding = (p: Playback | undefined) => Boolean(p && (p.fullAudio.playing || (p.mode === "verse" && p.player.playing)));

const noop = () => {};

/**
 * A document page's handle on the shared player. Same shape as `useDocumentPlayback`, so the reader
 * and its bar do not change.
 */
export function useDocumentPlaybackSession(inputs: SessionInputs): SessionPlayback {
  const current = useAudioSession();
  const live = useAudioEngine();
  const owner = current?.key === inputs.key;
  const sounding = isSounding(live?.playback);
  const { key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle, ready = true } = inputs;

  useEffect(() => {
    if (!ready) return;
    if (!current || (!owner && !sounding)) {
      // Nothing playing (or the other page's audio is paused): this page is the session now.
      setSession({ key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle });
      return;
    }
    if (!owner) return;
    // More verses loaded, or the titles arrived. Coming back with only the first page of verses must
    // not shrink the playing list: a shorter list rebuilds the queue and stops the verse.
    const grew = shlokas !== current.shlokas && shlokas.length >= current.shlokas.length;
    const changed =
      fullAudioUrl !== current.fullAudioUrl ||
      complete !== current.complete ||
      documentTitle !== current.documentTitle ||
      chapterTitle !== current.chapterTitle ||
      route !== current.route;
    if (grew || changed) {
      setSession({ ...current, shlokas: grew ? shlokas : current.shlokas, fullAudioUrl, complete, documentTitle, chapterTitle, route });
    }
  }, [ready, current, owner, sounding, key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle]);

  const waiting = !(owner && live?.key === key);
  const suktaTracks = useMemo(() => (fullAudioUrl ? [] : suktaTracksFrom(shlokas)), [fullAudioUrl, shlokas]);
  // While another page's audio plays, a Rigveda verse shows its play button only once its clip is
  // confirmed in storage (many were never uploaded). The answers are cached for when this page takes over.
  const probed = useAudioProbe(
    useMemo(
      () => (waiting && suktaTracks.length > 0 ? shlokas.flatMap((s) => (s.audio_url ? [s.audio_url] : [])) : []),
      [waiting, suktaTracks.length, shlokas],
    ),
  );
  const [openMeaningIds, setOpenMeaningIds] = useState<ReadonlySet<number>>(() => new Set());

  const idle = useMemo<SessionPlayback>(() => {
    const takeOver = (run: (playback: Playback) => void) => {
      pending = { key, run };
      // Synchronously, so the new player starts inside the tap: iPhone Safari plays audio only then.
      flushSync(() => setSession({ key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle }));
    };
    const toggleMeaning = (id: number) =>
      setOpenMeaningIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    const player: Playback["player"] = {
      activeId: null,
      playing: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      openMeaningIds,
      registerItemRef: noop,
      play: (id) => takeOver((p) => p.versePlayer.play(id)),
      pause: noop,
      stop: noop,
      toggle: (id) => takeOver((p) => p.versePlayer.play(id)),
      next: noop,
      prev: noop,
      seek: noop,
      toggleMeaning,
      hasNext: false,
      hasPrev: false,
      coversAll: false,
      setDisplayOverride: noop,
      missingIds: new Set(),
    };
    const fullAudio: Playback["fullAudio"] = {
      audioElement: createElement(Fragment),
      playing: false,
      currentTime: 0,
      duration: 0,
      index: 0,
      play: () => takeOver((p) => p.startFull()),
      playAt: (i) => takeOver((p) => p.fullAudio.playAt(i)),
      pause: noop,
      handover: noop,
      toggle: () => takeOver((p) => p.startFull()),
      seek: noop,
      playFrom: (t) => takeOver((p) => p.fullAudio.playFrom(t)),
    };
    const hasSuktaAudio = suktaTracks.length > 0;
    return {
      foreign: true,
      player,
      versePlayer: player,
      fullAudio,
      close: noop,
      hasPrevFull: false,
      hasNextFull: false,
      prevFull: noop,
      nextFull: noop,
      verseClipConfirmed: (s: Shloka) => !hasSuktaAudio || (s.audio_url != null && probed.get(s.audio_url) === true),
      suktaControls: hasSuktaAudio
        ? {
            has: (n: number) => suktaTracks.some((t) => t.sukta === n),
            playing: null,
            toggle: (n: number) => takeOver((p) => p.suktaControls?.toggle(n)),
          }
        : undefined,
      mode: null,
      startFull: () => takeOver((p) => p.startFull()),
      switchToFull: noop,
      activeShloka: null,
      fullRecordingControls: fullAudioUrl ? { playing: false, toggleAt: (id: number) => takeOver((p) => p.fullRecordingControls?.toggleAt(id)) } : undefined,
      hasSuktaAudio,
      suktaNumber: null,
      suktaLabel: null,
    };
  }, [key, route, shlokas, fullAudioUrl, complete, documentTitle, chapterTitle, openMeaningIds, suktaTracks, probed]);

  if (!waiting && live) return { ...live.playback, foreign: false };
  // Waiting on another page's audio only while it sounds; otherwise this page takes over next frame.
  return sounding && !owner ? idle : { ...idle, foreign: false };
}
