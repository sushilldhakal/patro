/**
 * The home page's panchanga detail aside, shared by the website's and the
 * app's `components/home/PanchangaVivaranPanel.tsx`: the six detail tiles
 * (sun, moonrise, ritu, nakshatra, yoga, karana — with the ayana mark), the
 * planet positions, the solar corrections and the abhijit footer.
 */
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import {
  formatAngaPatroTransitionHint,
  formatClockNepali,
  formatMonthMoonEventDisplay,
  formatPatroSignedCorrection,
  getAbhijitMuhurta,
  getAyanaDisplay,
  getMoonriseDisplay,
  getPanchangaDetail,
  getPlanetGocharLines,
  getRituDisplay,
  getRituSeason,
  getSolarCorrections,
  getSunriseDisplay,
  getSunsetDisplay,
  isAyanaNorthMark,
} from "@vedic-patro/read-models/panchanga-format";
import { useLocale } from "@vedic-patro/i18n/react";

type AngaBlock = {
  name_ne?: string;
  name?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
  next?: AngaBlock;
};

export type VivaranCell = {
  label: string;
  value?: string;
  hint?: string;
  mono?: boolean;
  /** The uttarayana/dakshinayana badge beside the sun times. */
  ayana?: { mark: string; label: string; north: boolean };
};

export function usePanchangaVivaran({ p, selectedDay }: { p?: PanchangaDay; selectedDay?: CalendarDay | null }) {
  const { t, lang } = useLocale();
  if (!p) return null;

  const angaName = (anga: AngaBlock | null | undefined) =>
    !anga ? undefined : lang === "en" ? (anga.name ?? anga.name_ne) : (anga.name_ne ?? anga.name);
  const detail = getPanchangaDetail(p);
  const nakshatra = (detail?.nakshatra ?? p.nakshatra) as AngaBlock | undefined;
  const yoga = (detail?.yoga ?? p.yoga) as AngaBlock | undefined;
  const karana = (detail?.karana ?? p.karana) as AngaBlock | undefined;

  const sunrise = getSunriseDisplay(p, lang) ?? (selectedDay?.sunrise ? formatClockNepali(selectedDay.sunrise, lang) : undefined);
  const sunset = getSunsetDisplay(p, lang) ?? (selectedDay?.sunset ? formatClockNepali(selectedDay.sunset, lang) : undefined);
  const moonrise = getMoonriseDisplay(p, lang) ?? (selectedDay ? formatMonthMoonEventDisplay(selectedDay, "moonrise", lang) : undefined);
  const ayana = getAyanaDisplay(p, selectedDay, lang);
  const ritu = getRituDisplay(p, lang);
  const season = getRituSeason(p, lang);

  const cells: VivaranCell[] = [
    {
      label: t("aside.sunrise_sunset"),
      value: sunrise && sunset ? `${sunrise} / ${sunset}` : undefined,
      ayana: sunrise && sunset && ayana ? { mark: ayana.mark, label: ayana.label, north: isAyanaNorthMark(ayana.mark) } : undefined,
      mono: true,
    },
    { label: t("aside.moonrise"), value: moonrise ?? t("sections.dash"), mono: true },
    // Nepali names the season and the ritu with the same word — don't print it twice.
    { label: t("aside.ritu"), value: ritu, hint: season === ritu ? undefined : season },
    { label: t("aside.nakshatra"), value: angaName(nakshatra), hint: formatAngaPatroTransitionHint(nakshatra, lang) },
    { label: t("aside.yoga"), value: angaName(yoga), hint: formatAngaPatroTransitionHint(yoga, lang) },
    { label: t("aside.karana"), value: angaName(karana), hint: formatAngaPatroTransitionHint(karana, lang) },
  ];

  const solar = getSolarCorrections(p);
  const hasSolar = solar?.deshaantar != null || solar?.akshamsha != null || solar?.belaantar != null;
  const abhijit = getAbhijitMuhurta(p);

  return {
    cells,
    gocharTitle: t("aside.gochar"),
    planets: getPlanetGocharLines(p, lang),
    solar: hasSolar
      ? ([
          ["aside.deshaantar", solar?.deshaantar],
          ["aside.akshamsha", solar?.akshamsha],
          ["aside.belaantar", solar?.belaantar],
        ] as const).map(([key, block]) => ({ label: t(key), value: formatPatroSignedCorrection(block) ?? "—" }))
      : [],
    abhijit: abhijit
      ? {
          title: t("abhijit.title"),
          range: `${abhijit.rangeDisplay}${
            abhijit.noonDisplay
              ? lang === "en"
                ? ` (noon ${abhijit.noonDisplay})`
                : ` (${t("abhijit.noon_short")} ${abhijit.noonDisplay})`
              : ""
          }`,
        }
      : null,
    abhijitUnavailable: t("abhijit.unavailable"),
    detailLink: t("panchanga.detail_title"),
  };
}
