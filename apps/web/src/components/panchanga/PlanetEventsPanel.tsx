import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchGocharJd, gocharKeys, type GocharNextEntry, type LocationParams } from "@/lib/api";
import {
  formatClockNepali,
} from "@/lib/panchanga-format";
import { toWesternRashi } from "@/lib/rashi-i18n";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { resolveRashiDisplay } from "@/lib/rashi-i18n";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { patroCard } from "@/lib/patro-classes";
import { civilIsoDatePart, civilIsoFromDate, parseCivilIsoToDate } from "@/lib/patro-day";

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
  if (entry.entry_time_local_short?.trim()) {
    return entry.entry_time_local_short.trim();
  }
  const raw = entry.entry_time_local.trim();
  const tIdx = raw.indexOf("T");
  const tail = tIdx >= 0 ? raw.slice(tIdx + 1) : raw.slice(raw.lastIndexOf(" ") + 1);
  const m = tail.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : tail;
}

function daysUntil(entryLocal: string, refDate: Date): number {
  const entryDay = civilIsoDatePart(entryLocal.split(" ")[0] ?? entryLocal);
  const refDay = civilIsoFromDate(refDate);
  const a = parseCivilIsoToDate(entryDay);
  const b = parseCivilIsoToDate(refDay);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

interface Props {
  /** Civil-day Julian identity from panchanga (`jd_ut`). */
  jdUt: number;
  /** Civil `date_ad` from panchanga (for relative day math). */
  refDateAd?: string;
  location: LocationParams;
  /** For “view more” link — full location object with search params. */
  browseLocation?: PanchangaLocation;
}

export function PlanetEventsPanel({ jdUt, refDateAd, location, browseLocation }: Props) {
  const { lang, digits } = useLocale();
  const { t } = useTranslation();
  const era = useCalendarEra();
  const refIso = refDateAd?.trim() ?? "";
  const refDate = useMemo(() => {
    if (!refIso) return null;
    return parseCivilIsoToDate(civilIsoDatePart(refIso));
  }, [refIso]);

  const { data, isLoading, isError } = useQuery({
    queryKey: gocharKeys.day(jdUt, location),
    queryFn: () => fetchGocharJd(jdUt, location),
    enabled: Number.isFinite(jdUt),
    staleTime: 1000 * 60 * 60,
  });

  const events = useMemo(() => {
    if (!data?.gochar) return [];
    const rows = GRAHA_ORDER.map((key) => {
      const g = data.gochar[key];
      const entry = g?.next_rashi_entry;
      if (!g || !entry?.entry_time_local) return null;
      const rel = refDate ? daysUntil(entry.entry_time_local, refDate) : 0;
      if (refDate && rel < 0) return null;
      const rashi = rashiNe(entry.to_rashi);
      const time = formatClockNepali(localTimePart(entry)) ?? "—";
      const enName = GRAHA_NAME[key].en;
      return {
        key,
        symbol: g.symbol,
        ne: `${g.name_ne} ${rashi}मा प्रवेश`,
        en: `${enName} enters ${toWesternRashi(entry.to_rashi) ?? entry.to_rashi}`,
        time,
        rel,
        sortKey: entry.entry_time_local,
      };
    }).filter((e): e is NonNullable<typeof e> => e != null);

    rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return rows;
  }, [data, refDate]);

  return (
    <div className={patroCard + " p-3.5 px-4"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-base font-bold">{bilingualText(lang, "आगामी ग्रह-गोचर", "Planetary events")}</h2>
        {browseLocation ? (
          <Link
            to="/gochar"
            search={patroRouteLinkSearch("/gochar", browseLocation, era) as Record<string, unknown>}
            className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-secondary transition-colors hover:border-secondary/40 hover:bg-secondary/10"
          >
            {t("gochar.view_more")}
          </Link>
        ) : null}
      </div>

      {isLoading && (
        <div className="px-4 py-6 text-sm">{bilingualText(lang, "लोड हुँदै…", "Loading…")}</div>
      )}

      {isError && (
        <div className="px-4 py-6 text-sm">
          {bilingualText(lang, "ग्रह-गोचर लोड गर्न सकिएन।", "Could not load planetary events.")}
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div className="px-4 py-6 text-sm">
          {bilingualText(lang, "कुनै आगामी गोचर छैन।", "No upcoming transits.")}
        </div>
      )}

      {!isLoading && !isError && events.length > 0 && (
        <div className="flex flex-col">
          {events.map((e) => (
            <div
              key={e.key}
              className="flex items-center gap-2.5 border-b border-border py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{bilingualText(lang, e.ne, e.en)}</span>
                <span className="text-sm font-semibold">
                  <span className="font-mono">{e.time}</span>
                </span>
              </span>
              <span className="whitespace-nowrap font-mono text-sm font-semibold">
                {e.rel === 0
                  ? bilingualText(lang, "आज", "Today")
                  : bilingualText(lang, `${digits(e.rel)} दिन`, `${digits(e.rel)}d`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
