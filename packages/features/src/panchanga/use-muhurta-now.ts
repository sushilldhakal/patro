/**
 * The panchanga "moment now" card and the time-based reading banner, shared
 * by the website's and the app's `components/panchanga/MuhurtaNowPanel.tsx`
 * (`MuhurtaNowPanel` and `EphemerisModeBanner`): the four windows with their
 * active flag or range, the instant line, the banner body as runs (the time
 * is a mono run), the before-sunrise note, and copy.
 */
import type { PanchangaDay } from "@vedic-patro/api-client";
import { formatBsDateLong } from "@vedic-patro/domain/calendar/bs-calendar";
import { windowLabel } from "@vedic-patro/read-models/panchanga/muhurta-now";
import { parseAdStr } from "@vedic-patro/domain/panchanga/panchanga-year-page";
import { useLocale } from "@vedic-patro/i18n/react";

type MuhurtaNowKey = keyof NonNullable<PanchangaDay["muhurta_now"]>;

export type MuhurtaTextRun = { text: string; mono?: boolean };

export function useMuhurtaNow({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const { t, digits } = useLocale();
  const now = p.muhurta_now;
  if (!now) return null;
  const labels: { key: MuhurtaNowKey; label: string }[] = [
    { key: "rahu_kalam", label: t("ui.panchanga.rahu_kalam") },
    { key: "yamaganda", label: t("ui.panchanga.yamaganda") },
    { key: "gulika", label: t("kundali.x.graha_gulika") },
    { key: "abhijit", label: t("ui.panchanga.abhijit") },
  ];
  const instantLabel = p.query_instant_local ?? clock;
  const instantTime = instantLabel ? (instantLabel.split(" ")[1] ?? instantLabel) : "";
  return {
    title: t("panchanga.muhurta_now.title"),
    instant: instantLabel ? t("ui.panchanga.status_at_instanttime", { instantTime: digits(instantTime) }) : null,
    rows: labels.map(({ key, label }) => {
      const block = now[key];
      const active = !!block?.active;
      return { key, label, active, value: active ? t("panchanga.muhurta_now.active") : (windowLabel(block, digits) ?? "—") };
    }),
  };
}

export function useEphemerisModeBanner({ p, clock, viewedDateAd }: { p: PanchangaDay; clock?: string; viewedDateAd?: string }) {
  const { t, lang, digits } = useLocale();
  const time = p.query_instant_local?.split(" ")[1] ?? clock;
  const viewedAd = viewedDateAd ?? p.query_instant_local?.split(" ")[0];
  const viewedDateLabel = viewedAd ? formatBsDateLong(parseAdStr(viewedAd), lang, digits) : null;
  const body: MuhurtaTextRun[] = time
    ? lang === "en"
      ? [
          { text: "Tithi, nakshatra, yoga and karana from the actual planetary positions at " },
          { text: digits(time), mono: true },
          { text: ". Based on precise sky calculations, so it may differ slightly from printed theoretical patros." },
        ]
      : [{ text: digits(time), mono: true }, { text: t("ui.panchanga.x_324ebf10") }]
    : [{ text: t("panchanga.muhurta_now.ephemeris_no_time") }];
  if (p.before_sunrise_of_civil_day) {
    body.push({
      text: viewedDateLabel
        ? t("ui.panchanga.this_time_is_before_sunrise_on", { viewedDateLabel, viewedDateLabel2: viewedDateLabel })
        : t("panchanga.muhurta_now.before_sunrise_generic"),
    });
  }
  return { title: t("panchanga.muhurta_now.time_based_reading"), body };
}
