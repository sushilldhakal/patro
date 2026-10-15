/**
 * The live ghati clock, shared by the website's and the app's
 * `components/panchanga/GhatiClock.tsx` (data only): the ticking time in the
 * location's zone, the vedic ghati / pala / vipala since sunrise, the civil
 * hour / minute / second (all in locale digits), and the labels. Each app
 * draws the panel.
 */
import { useEffect, useState } from "react";
import { parseTimeToMinutes } from "@vedic-patro/domain/ghati-clock";
import { getZonedTimeParts, minutesSinceMidnightInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function useGhatiClock({
  sunrise,
  timezone,
  tickMs = 200,
}: {
  sunrise?: string;
  timezone?: string;
  /** How often the clock re-renders (the app ticks once a second). */
  tickMs?: number;
}) {
  const { t, digits } = useLocale();
  const [now, setNow] = useState(() => new Date());
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const { hour, minute, second } = getZonedTimeParts(now, timeZone);
  const sunriseMin = parseTimeToMinutes(sunrise) ?? 5 * 60 + 12;
  let vg = (minutesSinceMidnightInTimezone(now, timeZone, true) - sunriseMin) / 24;
  if (vg < 0) vg += 60;
  const gh = Math.floor(vg);
  const pa = Math.floor((vg - gh) * 60);
  const vi = Math.floor(((vg - gh) * 60 - pa) * 60);
  const two = (n: number) => digits(pad2(n));

  return {
    vedic: { ghati: two(gh), pala: two(pa), vipala: two(vi) },
    civil: { hour: two(hour), minute: two(minute), second: two(second) },
    copy: {
      title: t("panchanga.vedic_time"),
      vedicUnits: t("panchanga.ghati_pala_vipala"),
      civilUnits: t("panchanga.hour_minute"),
    },
  };
}
