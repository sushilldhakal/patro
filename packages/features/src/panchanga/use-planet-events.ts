/**
 * The panchanga aside's upcoming planet events, shared by the website's and
 * the app's `components/panchanga/PlanetEventsPanel.tsx`: the gochar query for
 * the viewed day, each graha's next rashi entry still ahead of that day
 * (sorted by time), its bilingual line, clock and "in N days", and copy.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchGocharJd, gocharKeys, type GocharNextEntry, type LocationParams } from "@vedic-patro/api-client";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatClockNepali } from "@vedic-patro/domain/panchanga-format";
import { civilIsoDatePart, civilIsoFromDate, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { resolveRashiDisplay, toWesternRashi } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

const GRAHA_ORDER = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const satisfies readonly GrahaKey[];

function rashiNe(english?: string): string {
  if (!english) return "—";
  return resolveRashiDisplay(undefined, english, "ne") ?? english;
}

function localTimePart(entry: GocharNextEntry): string {
  if (entry.entry_time_local_short?.trim()) return entry.entry_time_local_short.trim();
  const raw = entry.entry_time_local.trim();
  const tIdx = raw.indexOf("T");
  const tail = tIdx >= 0 ? raw.slice(tIdx + 1) : raw.slice(raw.lastIndexOf(" ") + 1);
  const m = tail.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : tail;
}

function daysUntil(entryLocal: string, refDate: Date): number {
  const entryDay = civilIsoDatePart(entryLocal.split(" ")[0] ?? entryLocal);
  const a = parseCivilIsoToDate(entryDay);
  const b = parseCivilIsoToDate(civilIsoFromDate(refDate));
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export type PlanetEvent = { key: GrahaKey; symbol?: string; text: string; time: string; rel: string };

export function usePlanetEvents({
  jdUt,
  refDateAd,
  location,
  showViewMore = false,
}: {
  /** Civil-day Julian identity from panchanga (`jd_ut`). */
  jdUt: number;
  /** Civil `date_ad` from panchanga (for relative day math). */
  refDateAd?: string;
  location: LocationParams;
  /** The page can link to the gochar page for the viewed day (the website's
   * `browseLocation`); without it the panel has no "view more" link. */
  showViewMore?: boolean;
}) {
  const { t, lang, digits } = useLocale();
  const refIso = refDateAd?.trim() ?? "";
  const refDate = refIso ? parseCivilIsoToDate(civilIsoDatePart(refIso)) : null;

  const { data, isLoading, isError } = useQuery({
    queryKey: gocharKeys.day(jdUt, location),
    queryFn: () => fetchGocharJd(jdUt, location),
    enabled: Number.isFinite(jdUt),
    staleTime: 1000 * 60 * 60,
  });

  const rows = data?.gochar
    ? GRAHA_ORDER.flatMap((key) => {
        const g = data.gochar[key];
        const entry = g?.next_rashi_entry;
        if (!g || !entry?.entry_time_local) return [];
        const rel = refDate ? daysUntil(entry.entry_time_local, refDate) : 0;
        if (refDate && rel < 0) return [];
        return [
          {
            key,
            symbol: g.symbol,
            text: bilingualText(
              lang,
              t("ui.panchanga.x_be9a266a", { v0: g.name_ne, v1: rashiNe(entry.to_rashi) }),
              `${GRAHA_NAME[key].en} enters ${toWesternRashi(entry.to_rashi) ?? entry.to_rashi}`,
            ),
            time: formatClockNepali(localTimePart(entry)) ?? "—",
            rel: rel === 0 ? t("today") : t("ui.panchanga.rel_d", { rel: digits(rel) }),
            sortKey: entry.entry_time_local,
          },
        ];
      }).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    : [];
  const events: PlanetEvent[] = rows.map(({ sortKey: _sortKey, ...e }) => e);

  const status: "loading" | "error" | "empty" | "ready" = isLoading
    ? "loading"
    : isError
      ? "error"
      : events.length === 0
        ? "empty"
        : "ready";

  return {
    title: t("panchanga.planet_events.title"),
    /** "View more" link text, or null when the panel shows no link. */
    viewMore: showViewMore ? t("gochar.view_more") : null,
    status,
    stateText:
      status === "loading"
        ? t("common.loading")
        : status === "error"
          ? t("panchanga.planet_events.load_error")
          : status === "empty"
            ? t("panchanga.planet_events.no_upcoming")
            : null,
    events,
  };
}
