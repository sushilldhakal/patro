import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchGocharJd, gocharKeys, type GocharNextEntry, type LocationParams } from "@/lib/api";
import {
  formatClockNepali,
} from "@vedic-patro/domain/panchanga-format";
import { toWesternRashi } from "@vedic-patro/domain/rashi-i18n";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { patroCard } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { civilIsoDatePart, civilIsoFromDate, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";

import { tFor } from "@vedic-patro/i18n/runtime";
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
    <div className={`${patroCard} ${panchangaPageClasses.aside.eventsCard}`}>
      <div className={`flex ${panchangaPageClasses.aside.eventsHead}`}>
        <h2 className={panchangaPageClasses.aside.eventsTitle}>{tFor(lang, "panchanga.planet_events.title")}</h2>
        {browseLocation ? (
          <Link
            to="/gochar"
            search={patroRouteLinkSearch("/gochar", browseLocation, era) as Record<string, unknown>}
            className={`${panchangaPageClasses.aside.eventsLink} ${panchangaPageClasses.aside.eventsLinkText} transition-colors hover:border-secondary/40 hover:bg-secondary/10`}
          >
            {t("gochar.view_more")}
          </Link>
        ) : null}
      </div>

      {isLoading && (
        <div className={panchangaPageClasses.aside.eventsStatus}>{tFor(lang, "common.loading")}</div>
      )}

      {isError && (
        <div className={panchangaPageClasses.aside.eventsStatus}>
          {tFor(lang, "panchanga.planet_events.load_error")}
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div className={panchangaPageClasses.aside.eventsStatus}>
          {tFor(lang, "panchanga.planet_events.no_upcoming")}
        </div>
      )}

      {!isLoading && !isError && events.length > 0 && (
        <div className={`flex ${panchangaPageClasses.aside.eventsList}`}>
          {events.map((e) => (
            <div
              key={e.key}
              className={`flex ${panchangaPageClasses.aside.eventsRow}`}
            >
              <span className={`flex ${panchangaPageClasses.aside.eventsBody}`}>
                <span className={panchangaPageClasses.aside.eventsName}>{bilingualText(lang, e.ne, e.en)}</span>
                <span className={panchangaPageClasses.aside.eventsName}>
                  <span className="font-mono">{e.time}</span>
                </span>
              </span>
              <span className={panchangaPageClasses.aside.eventsRel}>
                {e.rel === 0
                  ? tFor(lang, "today")
                  : tFor(lang, "ui.panchanga.rel_d", { rel: digits(e.rel) })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
