/**
 * The guided tour's chrome — welcome overlay, transport bar and table of
 * contents — shared by the website (`apps/web/src/components/learn/DayChapterPlayer.tsx`)
 * and the app (`apps/mobile/components/learn/playground/DayChapterPlayer.tsx`).
 * Each app draws the scrubber, buttons and the contents sheet its own way.
 */

import { useMemo, useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { formatChapterClock } from "@vedic-patro/domain/learn/chapter-player";
import { chapterParts } from "@vedic-patro/domain/learn/chapter-tracks";
import type { DayChapterPlayer } from "./use-chapter-track";

/** The opening card over the scene, before the first chapter plays. */
export function useDayChapterWelcome(player: DayChapterPlayer) {
  const { t } = useLocale();
  const lastIndex = player.chapters.length - 1;
  /* The original's second way in: "or … go to playground" — only when this
     track actually ends on a free chapter to jump to. */
  const hasPlayground = Boolean(player.chapters[lastIndex]?.free);
  return {
    visible: player.showWelcome,
    eyebrow: t("learn.chapters.eyebrow"),
    title: t(player.track.titleKey),
    subtitle: t(player.track.subtitleKey),
    begin: t("learn.chapters.begin"),
    play: player.play,
    playground: hasPlayground
      ? { label: t("learn.chapters.playground"), open: () => player.goTo(lastIndex) }
      : null,
  };
}

export type ChapterVolumeLevel = "mute" | "low" | "high";

/** Scrubber, chapter title, contents list, transport and volume for the tour bar. */
export function useDayChapterBar(player: DayChapterPlayer) {
  const { t, digits } = useLocale();
  const [tocOpen, setTocOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);

  const parts = useMemo(() => chapterParts(player.chapters), [player.chapters]);
  const free = Boolean(player.chapter.free);
  const isLast = player.index >= player.chapters.length - 1;
  const isFirst = player.index <= 0;
  const { playing, ended } = player;

  const contents = parts.map((part, pi) => ({
    key: part.partKey ?? `p-${pi}`,
    label: part.partKey ? t(part.partKey) : null,
    items: part.items.map(({ chapter, index }) => ({
      id: chapter.id,
      index,
      number: digits(index + 1),
      title: t(chapter.titleKey),
      active: index === player.index,
      select: () => {
        player.goTo(index);
        setTocOpen(false);
      },
    })),
  }));

  return {
    /** Free play has no scrubber and no transport row — narration is all they belong to. */
    free,
    scrub: {
      value: player.time,
      max: player.duration || 1,
      step: 50,
      progress: player.duration > 0 ? (player.time / player.duration) * 100 : 0,
      label: t("learn.chapters.scrub"),
      time: digits(formatChapterClock(player.time)),
      duration: digits(formatChapterClock(player.duration)),
      seek: player.seek,
    },
    /** "Chapter 3: …" — the button that opens the contents. */
    heading: `${t("learn.chapters.chapter")} ${digits(player.index + 1)}: ${t(player.chapter.titleKey)}`,
    toc: {
      open: tocOpen,
      setOpen: setTocOpen,
      title: t("learn.chapters.chapter_list"),
      closeLabel: t("common.close"),
      parts: contents,
    },
    transport: {
      isFirst,
      isLast,
      playing,
      ended,
      /** The chapter is over and another follows — the next button glows. */
      nextHighlighted: ended && !isLast,
      prev: player.prev,
      next: player.next,
      prevLabel: t("learn.chapters.prev"),
      nextLabel: t("learn.chapters.next"),
      playLabel: t("learn.play"),
      pauseLabel: t("learn.pause"),
      primaryLabel: ended ? t("learn.chapters.replay") : playing ? t("learn.pause") : t("learn.play"),
      /** Replay from the top once ended; otherwise play/pause. */
      primary: ended
        ? () => {
            player.seek(0);
            player.play();
          }
        : player.toggle,
    },
    volume: {
      value: player.volume,
      level: (player.volume === 0 ? "mute" : player.volume < 0.5 ? "low" : "high") as ChapterVolumeLevel,
      label: t("learn.chapters.volume"),
      open: volumeOpen,
      setOpen: setVolumeOpen,
      set: player.setVolume,
      toggleMute: player.toggleMute,
    },
    /** App-only: the year-orbit toggle the app keeps beside the transport. */
    orbitLabels: { pause: t("ui.learn.pause_orbit"), run: t("ui.learn.run_orbit") },
  };
}
