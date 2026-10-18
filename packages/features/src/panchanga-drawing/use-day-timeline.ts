/**
 * The day timeline, shared by the website's and the app's
 * `components/panchanga/DayTimeline.tsx`: the timeline data for the day
 * boundary (sunrise to sunrise, or midnight to midnight), the planet rows, the
 * live clock on today, where the "now" needle sits and what it says, and the
 * band, legend, axis and section copy. Each app draws the chart.
 */
import { useEffect, useState } from "react";
import type { CivilTimeline, PanchangaDay } from "@vedic-patro/api-client";
import { buildCivilTimelineData, buildDayTimelineData, needleGhatiOnVedicChart } from "@vedic-patro/read-models/day-timeline-data";
import { minutesOnVedicChart } from "@vedic-patro/domain/day-timeline-layout";
import { getPlanetRows, getSunriseLagnaRow } from "@vedic-patro/read-models/panchanga-format";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";

export type DayTimelineMode = "Day-Night" | "Calendar Day";

export function useDayTimeline({
  p,
  dateAd,
  isToday = false,
  timezone,
  needleClock,
  showNeedle = true,
  loading = false,
  mode = "Day-Night",
  civil,
  civilLoading = false,
}: {
  p?: PanchangaDay | null;
  dateAd?: string;
  isToday?: boolean;
  timezone?: string;
  needleClock?: string;
  showNeedle?: boolean;
  loading?: boolean;
  mode?: DayTimelineMode;
  civil?: CivilTimeline;
  civilLoading?: boolean;
}) {
  const { t } = useLocale();
  const isCivil = mode === "Calendar Day";
  const data = isCivil ? (civil ? buildCivilTimelineData(civil, p ?? undefined) : null) : p ? buildDayTimelineData(p) : null;
  const planets = (() => {
    if (!p) return [];
    const rows = getPlanetRows(p);
    const lagna = getSunriseLagnaRow(p);
    return lagna ? [lagna, ...rows] : rows;
  })();
  const timeZone = resolveTimeZone(p?.location?.timezone, timezone);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const busy = loading || (isCivil ? civilLoading || !civil : !p) || !data;

  // Where the needle sits (in ghati, 0..60) and its label. A chosen clock
  // pins it (the pill already prints the clock, so the label stays empty);
  // on today it tracks the live time; otherwise the ephemeris query instant.
  let nowG: number | null = null;
  let nowLabel = t("panchanga.day_cycle.now");
  if (data) {
    const anchorAd = p?.panchanga_date_ad ?? p?.date_ad ?? dateAd;
    const chartMins = minutesOnVedicChart(p?.query_instant_local, anchorAd ?? "", needleClock);
    if (isCivil) {
      let mins: number | null = null;
      if (showNeedle && needleClock) {
        const [hh, mm] = needleClock.split(":").map(Number);
        if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
          mins = hh! * 60 + mm!;
          nowLabel = "";
        }
      } else if (showNeedle && isToday) {
        mins = minutesSinceMidnightInTimezone(now, timeZone);
      } else if (showNeedle && chartMins != null) {
        mins = chartMins % (24 * 60);
        nowLabel = t("panchanga.day_cycle.chosen_time");
      }
      if (mins != null) nowG = Math.max(0, Math.min(60, mins / 24));
    } else if (showNeedle && needleClock && chartMins != null) {
      nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
      if (nowG != null) nowLabel = "";
    } else if (showNeedle && isToday) {
      nowG = needleGhatiOnVedicChart(minutesSinceMidnightInTimezone(now, timeZone), data.sunriseMin);
    } else if (showNeedle && chartMins != null) {
      nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
      if (nowG != null) nowLabel = t("panchanga.day_cycle.chosen_time");
    }
  }

  return {
    isCivil,
    data,
    planets,
    timeZone,
    now,
    busy,
    nowG,
    nowLabel,
    copy: {
      title: t("panchanga.day_cycle.title"),
      subtitle: isCivil
        ? t("ui.panchanga.full_panchanga_timeline_midnight_to_midnight")
        : t("ui.panchanga.full_panchanga_timeline_sunrise_to_sunrise"),
      good: t("panchanga.day_cycle.good"),
      bad: t("panchanga.day_cycle.bad"),
      night: t("panchanga.day_cycle.night"),
      chartAria: t("ui.panchanga.full_panchanga_day_chart"),
      hour: t("panchanga.hour_aria"),
      ghati: t("panchanga.day_cycle.ghati"),
      inauspicious: t("panchanga.day_cycle.inauspicious_periods"),
      auspicious: t("panchanga.day_cycle.auspicious_periods"),
      planets: t("panchanga.day_cycle.planets"),
      lordSub: t("panchanga.day_cycle.lord_sub"),
      lordSubTitle: t("panchanga.day_cycle.lord_sub_title"),
    },
  };
}

/** The day-boundary toggle: both modes, which one is off, and labels. */
export function useDayCycleToggle(mode: DayTimelineMode) {
  const { t } = useLocale();
  const options: { value: DayTimelineMode; label: string }[] = [
    { value: "Day-Night", label: t("ui.panchanga.day_night") },
    { value: "Calendar Day", label: t("ui.panchanga.calendar_day") },
  ];
  const inactive = options.find((o) => o.value !== mode) ?? options[0]!;
  return {
    options,
    inactive,
    switchLabel: t("ui.panchanga.x_3dc91e42", { v0: inactive.label }),
    groupLabel: t("panchanga.day_cycle.day_boundary"),
  };
}
