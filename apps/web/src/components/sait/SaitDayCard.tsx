import { Baby, Clock3, Compass } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { BS_MONTH_NAMES } from "@vedic-patro/domain/bs-calendar";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type {
  SaitDetailDay,
  SaitPersonalizeDay,
  SaitShuddhiPlanet,
  SaitShuddhiTone,
  SaitSuitability,
} from "@/lib/api";
import { SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { SuitabilityBadge } from "@/components/sait/sait-suitability";

import { tFor } from "@vedic-patro/i18n/runtime";
/**
 * One qualifying muhūrta day: the representative clean window plus the
 * panchāṅga that made the day survive the rules.
 */
const SHUDDHI_PLANET_LABEL: Record<SaitShuddhiPlanet["planet"], string> = {
  sun: "grahas.sun",
  moon: "grahas.moon",
  guru: "kundali.x.graha_guru",
  shukra: "grahas.venus",
};

const SHUDDHI_SUMMARY: Record<SaitShuddhiTone, string> = {
  good: "sait.x.shuddhi_good",
  shanti: "sait.x.shuddhi_shanti",
  avoid: "sait.x.shuddhi_avoid",
};

export function SaitDayCard({
  d,
  index = 0,
  suitability,
  personalize,
}: {
  d: SaitDetailDay;
  index?: number;
  suitability?: SaitSuitability;
  personalize?: SaitPersonalizeDay;
}) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();
  const shuddhi = personalize?.shuddhi ?? null;
  const kumbha = personalize?.kumbha ?? null;
  const annaMonth = personalize?.anna_month ?? null;
  const overnight = d.window_end < d.window_start;
  const monthLabel = bilingualText(lang, d.bs_month_name_ne, BS_MONTH_NAMES[d.bs_month - 1] ?? d.bs_month_name_ne);
  const paksha = bilingualText(lang, d.paksha_ne, d.paksha === "shukla" ? "Shukla" : d.paksha === "krishna" ? "Krishna" : d.paksha_ne);
  const rows: { label: string; value: string }[] = [
    { label: t("sait.tithi"), value: `${paksha} ${bilingualText(lang, d.tithi_ne, d.tithi_en)}` },
    { label: t("sait.nak_atra"), value: bilingualText(lang, d.nakshatra_ne, d.nakshatra_en) },
    { label: t("sait.yoga"), value: bilingualText(lang, d.yoga_ne, d.yoga_en) },
    { label: t("sait.kara_a"), value: bilingualText(lang, d.karana_ne, d.karana_en) },
    {
      label: t("sait.lagna"),
      value: formatRashiDisplay(d.lagna_ne, d.lagna_en, lang) ?? bilingualText(lang, d.lagna_ne, d.lagna_en) ?? "—",
    },
    {
      label: t("sait.lunar_month"),
      value: bilingualText(lang, d.lunar_month_ne ?? "—", d.lunar_month_en ?? "—"),
    },
  ];

  return (
    <article
      className={cn(
        saitClasses.card,
        "animate-in fade-in fill-mode-both",
        suitability ? SUITABILITY_STYLE[suitability].ring : null,
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {suitability ? (
        <div className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </div>
      ) : null}
      <div className={saitClasses.cardHead}>
        <div className={saitClasses.dateBox}>
          <span className={saitClasses.dateMonth}>
            {monthLabel}
          </span>
          <span className={saitClasses.dateDay}>
            {digits(d.bs_day)}
          </span>
        </div>

        <div className={saitClasses.headBody}>
          <div className={saitClasses.titleRow}>
            <h3 className={cn("m-0", saitClasses.weekday)}>
              {bilingualText(lang, d.weekday_ne, d.weekday_en)}
            </h3>
            <span className={saitClasses.gregorian}>{d.gregorian}</span>
          </div>

          <div className={cn(saitClasses.windowChip, "inline-flex w-fit", saitClasses.windowText)}>
            <Clock3 className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className={saitClasses.windowTime}>
              {digits(d.window_start)} – {digits(d.window_end)}
              {overnight ? ` (${t("sait.1")})` : ""}
            </span>
            <span className={cn("hidden sm:inline", saitClasses.windowNote)}>
              {t("sait.lagna_window")}
            </span>
          </div>
        </div>
      </div>

      <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3", saitClasses.facts)}>
        {rows.map((r) => (
          <div key={r.label} className={saitClasses.factItem}>
            <dt className={saitClasses.factLabel}>{r.label}</dt>
            <dd className={cn("m-0 truncate", saitClasses.factValue)}>{r.value}</dd>
          </div>
        ))}
      </dl>

      {shuddhi && shuddhi.planets.length > 0 ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRow}>
            <span className={saitClasses.blockLabel}>
              {t("sait.graha_uddhi")}
            </span>
            {shuddhi.planets.map((p) => (
              <span
                key={p.planet}
                title={bilingualText(lang, p.rashi_ne, p.rashi_en)}
                className={cn(
                  saitClasses.chip,
                  "inline-flex",
                  saitClasses.chipGap,
                  saitClasses.chipText,
                  saitClasses.chipNum,
                  saitClasses.toneChip[p.tone],
                  saitClasses.toneChipText[p.tone],
                )}
              >
                {t(SHUDDHI_PLANET_LABEL[p.planet])}
                <span>{digits(p.house)}</span>
              </span>
            ))}
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[shuddhi.tone])}>
            {t(SHUDDHI_SUMMARY[shuddhi.tone])}
            <span className={cn("ml-1", saitClasses.summaryNote)}>
              {t("sait.house_from_janma_r_i")}
            </span>
          </p>
        </div>
      ) : null}

      {kumbha ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRowLoose}>
            <span className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Compass className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {t("sait.kumbha_chakra")}
            </span>
            <span
              className={cn(
                saitClasses.chip,
                "inline-flex",
                saitClasses.chipText,
                saitClasses.toneChip[kumbha.tone],
                saitClasses.toneChipText[kumbha.tone],
              )}
            >
              {bilingualText(lang, kumbha.zone_ne, kumbha.zone_en)}
            </span>
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[kumbha.tone])}>
            {bilingualText(lang, kumbha.effect_ne, kumbha.effect_en)}
            <span className={cn("ml-1", saitClasses.summaryNote)}>
              {t("sait.counted_from_the_sun")}
            </span>
          </p>
        </div>
      ) : null}

      {annaMonth ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRowLoose}>
            <span className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Baby className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {t("sait.annapr_ana_age_month")}
            </span>
            <span
              className={cn(
                saitClasses.chip,
                "inline-flex",
                saitClasses.chipText,
                saitClasses.chipNum,
                saitClasses.toneChip[annaMonth.tone],
                saitClasses.toneChipText[annaMonth.tone],
              )}
            >
              {tFor(lang, "ui.sait.month_ordinal_month", { ordinal_month: digits(annaMonth.ordinal_month) })}
            </span>
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[annaMonth.tone])}>
            {annaMonth.matches
              ? t("sait.the_child_s_right_age_month")
              : t("sait.not_this_child_s_age_month")}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default SaitDayCard;
