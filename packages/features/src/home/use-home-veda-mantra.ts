/**
 * The home page's "Veda mantra of the day" card, shared by the website's and
 * the app's `components/home/HomeVedaMantra.tsx`: the day's request, the
 * Sanskrit as word tokens (with the word sounding at a given point of the
 * recording), the meaning, the source line, where "read more" goes, and
 * copy. Each app plays the recording with its own audio engine.
 */
import { useEffect, useMemo } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { DOCUMENTS_STALE_TIME, fetchVedaDaily, vedaDailyKeys, type VedaDaily } from "@vedic-patro/api-client";
import { activeTokenAt, buildWordTrack } from "@vedic-patro/domain/word-tracking";
import { useLocale } from "@vedic-patro/i18n/react";

function addDays(dateAd: string, days: number): string {
  const [y, m, d] = dateAd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

function sourceLine(data: VedaDaily, lang: string, digits: (v: string | number) => string): string {
  const parts = data.source_parts.map((part) => {
    const label = (lang === "en" ? part.label_en : part.label_ne) ?? "";
    // A chapter title carries its own number; the others pair a label with a value.
    return part.value == null ? label.replace(/\d+/g, (m) => digits(m)) : `${label} ${digits(part.value)}`;
  });
  return [lang === "en" ? data.veda.name_en : data.veda.name_ne, ...parts].join(" » ");
}

export function useHomeVedaMantra(
  dateAd: string | undefined,
  {
    offlineDays = 0,
  }: {
    /**
     * Days fetched ahead so the card still has a mantra with no connection
     * (the app persists its query cache); the previous day's mantra also
     * stays up while the next loads.
     */
    offlineDays?: number;
  } = {},
) {
  const { t, lang, digits } = useLocale();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: vedaDailyKeys.day(dateAd ?? ""),
    queryFn: () => fetchVedaDaily(dateAd!),
    enabled: Boolean(dateAd),
    staleTime: DOCUMENTS_STALE_TIME,
    placeholderData: offlineDays > 0 ? keepPreviousData : undefined,
  });

  useEffect(() => {
    if (!dateAd || !data || offlineDays <= 0) return;
    for (let i = 1; i <= offlineDays; i += 1) {
      const next = addDays(dateAd, i);
      void queryClient.prefetchQuery({
        queryKey: vedaDailyKeys.day(next),
        queryFn: () => fetchVedaDaily(next),
        staleTime: DOCUMENTS_STALE_TIME,
      });
    }
  }, [dateAd, data, offlineDays, queryClient]);

  const sanskrit = data?.shloka.sanskrit ?? "";
  const wordTrack = useMemo(() => buildWordTrack(sanskrit), [sanskrit]);

  const copy = {
    title: t("home_veda.title"),
    play: t("home_veda.play"),
    pause: t("home_veda.pause"),
    meaning: t("home_veda.meaning"),
    readMore: t("ui.home.read_more"),
  };

  if (!data) return { ready: false as const, copy, audioUrl: null };

  const { shloka } = data;
  return {
    ready: true as const,
    copy,
    audioUrl: shloka.audio_url ?? null,
    tokens: wordTrack.tokens,
    /** Token index of the word sounding at `progress` (0..1, -1 when nothing plays). */
    activeTokenAt: (progress: number) => activeTokenAt(wordTrack, progress),
    meaning: (lang === "en" ? shloka.meaning_en : shloka.meaning_ne) ?? shloka.meaning_en ?? shloka.meaning_ne ?? null,
    source: sourceLine(data, lang, digits),
    /** The passage in its chapter: route params and the verse anchor. */
    read: {
      slug: data.read_slug,
      chapter: String(data.read_chapter),
      verse: data.read_verse,
      anchor: `shloka-${data.read_verse.trim().replace(/\s+/g, "-")}`,
    },
  };
}
