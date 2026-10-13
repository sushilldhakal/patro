import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import {
  DOCUMENTS_STALE_TIME,
  fetchVedaDaily,
  vedaDailyKeys,
  type VedaDaily,
} from "@/lib/documents-api";
import { useLocale } from "@/i18n/locale";
import { setMediaHandlers, setMediaMetadata, setMediaPlaybackState } from "@/lib/media-session";
import { patroCard, patroSecBand } from "@/lib/patro-classes";
import { activeTokenAt, buildWordTrack } from "@vedic-patro/domain/word-tracking";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
function sourceLine(data: VedaDaily, lang: string, digits: (v: string | number) => string): string {
  const parts = data.source_parts.map((part) => {
    const label = (lang === "en" ? part.label_en : part.label_ne) ?? "";
    // A chapter title carries its own number ("मण्डल 3"); the others pair a label with a value.
    return part.value == null ? label.replace(/\d+/g, (m) => digits(m)) : `${label} ${digits(part.value)}`;
  });
  return [lang === "en" ? data.veda.name_en : data.veda.name_ne, ...parts].join(" » ");
}

/**
 * One recording. `progress` (0..1) is read on every animation frame while it
 * plays so the word highlight follows smoothly; it is -1 when nothing plays.
 */
function useMantraAudio(url: string | null | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const raf = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(-1);

  useEffect(() => {
    if (!url) return;
    const el = new Audio(url);
    el.preload = "none";
    const stopLoop = () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
    const tick = () => {
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
      raf.current = requestAnimationFrame(tick);
    };
    el.onplay = () => {
      setPlaying(true);
      stopLoop();
      raf.current = requestAnimationFrame(tick);
      setMediaMetadata(document.title);
      setMediaHandlers({ play: () => void el.play().catch(() => {}), pause: () => el.pause() });
      setMediaPlaybackState("playing");
    };
    el.onpause = () => {
      if (el.ended) return;
      setPlaying(false);
      stopLoop();
      setMediaPlaybackState("paused");
    };
    el.onended = () => {
      setPlaying(false);
      setProgress(-1);
      stopLoop();
      setMediaPlaybackState("paused");
    };
    audio.current = el;
    return () => {
      stopLoop();
      el.pause();
      el.src = "";
      audio.current = null;
      setPlaying(false);
      setProgress(-1);
    };
  }, [url]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  return { playing, progress: playing ? progress : -1, toggle };
}

function MantraPlayButton({
  playing,
  onToggle,
  label,
}: {
  playing: boolean;
  onToggle: () => void;
  label: { play: string; pause: string };
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? label.pause : label.play}
      className={cn("inline-flex shrink-0 text-secondary-foreground transition-opacity hover:opacity-90 active:scale-95", homeClasses.vedaPlay)}
    >
      {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
    </button>
  );
}

/** Today's Veda mantra — Sanskrit, meaning where there is one, audio, and a link to the passage. */
export function HomeVedaMantra({ dateAd, className }: { dateAd: string | undefined; className?: string }) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const { data } = useQuery({
    queryKey: vedaDailyKeys.day(dateAd ?? ""),
    queryFn: () => fetchVedaDaily(dateAd!),
    enabled: Boolean(dateAd),
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const mantraAudio = useMantraAudio(data?.shloka.audio_url);
  const wordTrack = useMemo(() => buildWordTrack(data?.shloka.sanskrit ?? ""), [data?.shloka.sanskrit]);
  if (!data) return null;

  const { shloka } = data;
  const activeToken = activeTokenAt(wordTrack, mantraAudio.progress);
  const meaning = (lang === "en" ? shloka.meaning_en : shloka.meaning_ne) ?? shloka.meaning_en ?? shloka.meaning_ne;
  const anchor = `shloka-${data.read_verse.trim().replace(/\s+/g, "-")}`;

  return (
    <section className={cn(patroCard, className)} aria-label={t("home_veda.title")}>
      <div className={patroSecBand}>
        <h2 className={homeClasses.vedaTitle}>{t("home_veda.title")}</h2>
        {shloka.audio_url ? (
          <MantraPlayButton
            playing={mantraAudio.playing}
            onToggle={mantraAudio.toggle}
            label={{ play: t("home_veda.play"), pause: t("home_veda.pause") }}
          />
        ) : null}
      </div>
      <div className={homeClasses.vedaBody}>
        <p lang="sa" className={homeClasses.vedaSanskrit}>
          {wordTrack.tokens.map((tok, i) =>
            i === activeToken ? (
              <span
                key={i}
                className={cn(homeClasses.vedaWord, "px-0.5 transition-colors duration-150")}
              >
                {tok}
              </span>
            ) : (
              tok
            ),
          )}
        </p>
        {meaning ? (
          <div className={homeClasses.vedaMeaning}>
            <span className={homeClasses.vedaMeaningLabel}>{t("home_veda.meaning")}</span>
            <p className={homeClasses.vedaMeaningText}>{meaning}</p>
          </div>
        ) : null}
        <div className={homeClasses.vedaFooter}>
          <Link
            to="/documents/$slug/$chapter"
            params={{ slug: data.read_slug, chapter: String(data.read_chapter) }}
            hash={anchor}
            className={cn(homeClasses.vedaMore, "no-underline hover:underline")}
          >
            {tFor(lang, "ui.home.read_more")}
          </Link>
          <span className={homeClasses.vedaSource}>{sourceLine(data, lang, digits)}</span>
        </div>
      </div>
    </section>
  );
}
