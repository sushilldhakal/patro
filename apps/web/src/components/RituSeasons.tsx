import { useMemo, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sprout, HelpCircle } from "lucide-react";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { fetchTropicalSeasons, seasonsKeys } from "@/lib/api";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  RITU_MARKER_KEYS,
  RITU_SEASON_EMOJI,
  RITU_SEASON_KEYS,
  displayRituSlot,
} from "@/lib/ritu-display";
import {
  displayLocationLabel,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
/**
 * ऋतु — the six traditional Nepali seasons, driven by the Sun's APPARENT TROPICAL
 * longitude (sāyana), i.e. the actual equinoxes and solstices — NOT by the
 * sidereal rāśi / साङ्क्रान्ति. वसन्त begins at the vernal equinox and शरद् at the
 * autumnal equinox; the two solstices fall mid-season (in ग्रीष्म and हेमन्त).
 * Each ऋतु spans an equal 60° of tropical longitude (computed by API).
 *
 *   वसन्त   λ 0°    ग्रीष्म  λ 60°    वर्षा   λ 120°
 *   शरद्    λ 180°  हेमन्त  λ 240°    शिशिर  λ 300°
 *
 * The ऋतु labels are a NORTHERN-hemisphere (Nepal) climate scheme. A given solar
 * longitude is the OPPOSITE season in the southern hemisphere, so for a location
 * south of the equator we shift the displayed season by 3 slots (= 6 months =
 * 180° of solar longitude). The longitudes / dates themselves are unchanged — the
 * Sun's position is global; only which season that position *feels* like flips.
 */

const DAY = 86_400_000;

const midnightUtcMs = (adStr: string) => Date.parse(`${adStr}T00:00:00Z`);
/** A Date whose UTC calendar day equals the given civil date string. */
const civilNoon = (adStr: string) => new Date(`${adStr}T12:00:00Z`);
const fmtAd = (adStr: string, lang: "ne" | "en") =>
  civilNoon(adStr).toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

interface SeasonItem {
  solarSlot: number;
  angle: number;
  startBs: { day: number; month: number };
  startAd: string;
  isCurrent: boolean;
  daysUntil: number;
  progress: { elapsed: number; total: number; pct: number } | null;
}

export function RituSeasons({
  location,
  showHeader = true,
}: {
  location: PanchangaLocation;
  showHeader?: boolean;
}) {
  const { t } = useTranslation();
  const { digits: dg, lang } = useLocale();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  const tz = resolveLocationTimezone(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), tz), [tz]);

  const seasonsQ = useQuery({
    queryKey: seasonsKeys.tropical(location.params),
    queryFn: () => fetchTropicalSeasons(location.params),
    staleTime: 1000 * 60 * 60,
  });

  const south = seasonsQ.data?.southern_hemisphere ?? false;
  const [nowMs] = useState(() => Date.now());

  const seasons = useMemo<SeasonItem[]>(() => {
    const boundaries = seasonsQ.data?.boundaries;
    if (!boundaries?.length) return [];

    const todayMid = midnightUtcMs(todayAd);

    return boundaries.map((b, i) => {
      const startAd = todayAdStringInTimezone(new Date(b.start_instant_utc), tz);
      const bs = adToBS(civilNoon(startAd));
      const next = boundaries[i + 1];
      let progress: SeasonItem["progress"] = null;
      if (b.is_current && next) {
        const startMs = Date.parse(b.start_instant_utc);
        const endMs = Date.parse(next.start_instant_utc);
        const total = Math.max(1, (endMs - startMs) / DAY);
        const elapsed = Math.max(0, (nowMs - startMs) / DAY);
        progress = {
          elapsed: Math.round(elapsed),
          total: Math.round(total),
          pct: Math.max(0, Math.min(100, (elapsed / total) * 100)),
        };
      }
      return {
        solarSlot: b.slot,
        angle: b.angle,
        startBs: { day: bs.day, month: bs.month },
        startAd,
        isCurrent: b.is_current,
        daysUntil: Math.round((midnightUtcMs(startAd) - todayMid) / DAY),
        progress,
      };
    });
  }, [seasonsQ.data, todayAd, tz, nowMs]);

  const relLabel = (days: number) => {
    if (days <= 0) return "";
    if (days === 1) return t("ritu.tomorrow");
    return t("ritu.days_after", { count: days, days: dg(days) });
  };

  return (
    <div className={showHeader ? "mt-5.5" : undefined}>
      {showHeader ? (
        <div className={cn("flex flex-wrap", rituClasses.sectionHead)}>
          <Sprout className="self-center text-secondary dark:text-primary" size={18} strokeWidth={1.8} />
          <h2 className={cn("m-0", rituClasses.sectionTitle)}>{t("ritu.title")}</h2>
          <span className={rituClasses.sectionSub}>
            {t("ritu.subtitle")}{locationLabel ? ` · ${locationLabel}` : ""}
            {south && <span className={cn("ml-1 font-semibold text-warning")}>{t("ritu.southern")}</span>}
          </span>
          <Link
            to="/learn/$slug"
            params={{ slug: "ritu-drift" }}
            className={cn("inline-flex self-center whitespace-nowrap no-underline transition-colors hover:border-secondary/55 hover:bg-secondary/12 dark:hover:border-primary/55 dark:hover:bg-primary/14", rituClasses.whyLink, rituClasses.whyLinkText)}
          >
            <HelpCircle size={13} strokeWidth={2} aria-hidden />
            {t("ritu.why_link")}
          </Link>
        </div>
      ) : (
        <div className={cn("flex flex-wrap", rituClasses.toolbar)}>
          {south ? (
            <span className={rituClasses.southTag}>{t("ritu.southern")}</span>
          ) : null}
          <Link
            to="/learn/$slug"
            params={{ slug: "ritu-drift" }}
            className={cn("inline-flex whitespace-nowrap no-underline transition-colors hover:border-secondary/55 hover:bg-secondary/12 dark:hover:border-primary/55 dark:hover:bg-primary/14", rituClasses.whyLink, rituClasses.whyLinkText)}
          >
            <HelpCircle size={13} strokeWidth={2} aria-hidden />
            {t("ritu.why_link")}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 md:grid-cols-3">
        {seasons.map((item, i) => {
          const slot = displayRituSlot(item.solarSlot, south);
          const seasonKey = RITU_SEASON_KEYS[slot]!;
          const markerKey = RITU_MARKER_KEYS[item.solarSlot];
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col shadow-ring-soft",
                rituClasses.card,
                item.isCurrent &&
                  "shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--secondary)_38%,transparent)] dark:shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--primary)_38%,transparent)]",
              )}
            >
              <span
                className={cn(
                  rituClasses.kicker,
                  item.isCurrent && rituClasses.kickerCurrent,
                )}
              >
                {item.isCurrent ? t("ritu.current") : relLabel(item.daysUntil)}
              </span>
              <div className={cn("flex", rituClasses.seasonRow)}>
                <span className={rituClasses.emoji} aria-hidden>
                  {RITU_SEASON_EMOJI[seasonKey]}
                </span>
                <span className={rituClasses.nameWrap}>
                  <span className={cn("block", rituClasses.name)}>{t(`ritu.${seasonKey}`)}</span>
                </span>
                <span className={cn("flex h-[46px] w-[46px] flex-col bg-secondary/13", rituClasses.dateChip)}>
                  <span className={rituClasses.dateDay}>{dg(item.startBs.day)}</span>
                  <span className={rituClasses.dateMonth}>
                    {bilingualText(lang, BS_MONTHS_NE[item.startBs.month - 1], BS_MONTH_NAMES[item.startBs.month - 1])}
                  </span>
                </span>
              </div>
              <div className={cn("flex", rituClasses.metaRow)}>
                <span className={rituClasses.metaText}>
                  {markerKey
                    ? `${t(markerKey)} · ${t("ritu.sun_deg", { deg: dg(item.angle) })}`
                    : t("ritu.sun_deg", { deg: dg(item.angle) })}
                </span>
                <span className={cn("mono", rituClasses.metaFrom)}>
                  {fmtAd(item.startAd, lang)} {t("common.from")}
                </span>
              </div>
              {item.isCurrent && item.progress ? (
                <>
                  <div className={rituClasses.track} role="presentation">
                    <div
                      className={cn(rituClasses.bar, "bg-gradient-to-r from-secondary to-secondary/55 transition-[width] duration-400 ease-out dark:from-primary dark:to-primary/55")}
                      style={{ width: `${item.progress.pct}%` }}
                    />
                  </div>
                  <div className={cn("flex text-sm", rituClasses.progressRow)}>
                    <span className={rituClasses.progressText}>
                      {dg(item.progress.elapsed)} / {dg(item.progress.total)} {tFor(lang, "common.days")}
                    </span>
                    <span className={cn("mono", rituClasses.progressPct)}>
                      {dg(Math.round(item.progress.pct))}%
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {south && (
        <p className={rituClasses.southNote}>
          {tFor(lang, "ritu.southern_hemisphere_note")}
        </p>
      )}
    </div>
  );
}
