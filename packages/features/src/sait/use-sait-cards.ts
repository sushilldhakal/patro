/**
 * The ceremonial sait pages' parts, shared by the website's and the app's
 * `components/sait/`: the month-grouped day list with its count line
 * (`SaitCeremonyLayout`), one day card with its personal shuddhi, kumbha and
 * annaprashana blocks (`SaitDayCard`), and the collapsible rules with their
 * per-rule switches (`SaitRulesSection`). Each app draws them.
 */
import { useMemo, useState } from "react";
import type { SaitDetailDay, SaitPersonalizeDay, SaitShuddhiPlanet, SaitShuddhiTone } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES } from "@vedic-patro/domain/calendar/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatRashiDisplay } from "@vedic-patro/domain/panchanga/rashi-i18n";
import type { SaitRuleEntry } from "@vedic-patro/domain/festivals/sait-rules-content";
import { useLocale } from "@vedic-patro/i18n/react";

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

export const SAIT_NAKSHATRA_MODES = ["classical", "nepali", "liberal"] as const;

/** The key both the suitability and personalize maps use for a day. */
export const saitDayKey = (d: Pick<SaitDetailDay, "bs_month" | "bs_day">) => `${d.bs_month}-${d.bs_day}`;

export function useSaitCeremonyList({
  days = [],
  count,
  year,
  emptyLabel,
  countLabel,
}: {
  days?: SaitDetailDay[];
  count?: number;
  year: number;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
}) {
  const { t, lang, digits } = useLocale();
  const byMonth = useMemo(() => {
    const map = new Map<number, SaitDetailDay[]>();
    for (const d of days) {
      const list = map.get(d.bs_month) ?? [];
      list.push(d);
      map.set(d.bs_month, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [days]);
  const displayCount = count ?? days.length;

  return {
    displayCount,
    countText: countLabel ? countLabel(displayCount, year) : t("sait.count_label", { count: digits(displayCount), year: digits(year) }),
    months: byMonth.map(([month, monthDays]) => ({
      month,
      label:
        lang === "en"
          ? t("sait.month_number", { month: digits(month) })
          : (monthDays[0]?.bs_month_name_ne ?? t("sait.month_number", { month: digits(month) })),
      count: t("sait.days_count", { count: digits(monthDays.length) }),
      days: monthDays,
    })),
    empty: emptyLabel ?? t("sait.empty_year"),
    nakshatra: {
      label: t("sait.nakshatra_tradition"),
      modes: SAIT_NAKSHATRA_MODES.map((id) => ({ id, label: t(`sait.nakshatra_modes.${id}`) })),
    },
    allCeremonies: t("sait.all_ceremonies"),
  };
}

export function useSaitDayCard({ d, personalize }: { d: SaitDetailDay; personalize?: SaitPersonalizeDay }) {
  const { t, lang, digits } = useLocale();
  const shuddhi = personalize?.shuddhi ?? null;
  const kumbha = personalize?.kumbha ?? null;
  const anna = personalize?.anna_month ?? null;
  const paksha = bilingualText(lang, d.paksha_ne, d.paksha === "shukla" ? "Shukla" : d.paksha === "krishna" ? "Krishna" : d.paksha_ne);
  const overnight = d.window_end < d.window_start;

  return {
    month: bilingualText(lang, d.bs_month_name_ne, BS_MONTH_NAMES[d.bs_month - 1] ?? d.bs_month_name_ne),
    day: digits(d.bs_day),
    weekday: bilingualText(lang, d.weekday_ne, d.weekday_en),
    gregorian: d.gregorian,
    window: `${digits(d.window_start)} – ${digits(d.window_end)}${overnight ? ` (${t("sait.1")})` : ""}`,
    windowNote: t("sait.lagna_window"),
    facts: [
      { label: t("sait.tithi"), value: `${paksha} ${bilingualText(lang, d.tithi_ne, d.tithi_en)}` },
      { label: t("sait.nak_atra"), value: bilingualText(lang, d.nakshatra_ne, d.nakshatra_en) },
      { label: t("sait.yoga"), value: bilingualText(lang, d.yoga_ne, d.yoga_en) },
      { label: t("sait.kara_a"), value: bilingualText(lang, d.karana_ne, d.karana_en) },
      { label: t("sait.lagna"), value: formatRashiDisplay(d.lagna_ne, d.lagna_en, lang) ?? bilingualText(lang, d.lagna_ne, d.lagna_en) ?? "—" },
      { label: t("sait.lunar_month"), value: bilingualText(lang, d.lunar_month_ne ?? "—", d.lunar_month_en ?? "—") },
    ],
    shuddhi:
      shuddhi && shuddhi.planets.length > 0
        ? {
            label: t("sait.graha_uddhi"),
            planets: shuddhi.planets.map((p) => ({
              key: p.planet,
              name: t(SHUDDHI_PLANET_LABEL[p.planet]),
              house: digits(p.house),
              title: bilingualText(lang, p.rashi_ne, p.rashi_en),
              tone: p.tone,
            })),
            tone: shuddhi.tone,
            summary: t(SHUDDHI_SUMMARY[shuddhi.tone]),
            note: t("sait.house_from_janma_r_i"),
          }
        : null,
    kumbha: kumbha
      ? {
          label: t("sait.kumbha_chakra"),
          zone: bilingualText(lang, kumbha.zone_ne, kumbha.zone_en),
          tone: kumbha.tone,
          effect: bilingualText(lang, kumbha.effect_ne, kumbha.effect_en),
          note: t("sait.counted_from_the_sun"),
        }
      : null,
    anna: anna
      ? {
          label: t("sait.annapr_ana_age_month"),
          month: t("ui.sait.month_ordinal_month", { ordinal_month: digits(anna.ordinal_month) }),
          tone: anna.tone,
          summary: anna.matches ? t("sait.the_child_s_right_age_month") : t("sait.not_this_child_s_age_month"),
        }
      : null,
  };
}

export function useSaitRules({
  method,
  rules,
  engineVersion,
  defaultOpen = false,
  enabledRuleIds,
  onToggleRule,
}: {
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRuleEntry[] | null;
  engineVersion?: string;
  defaultOpen?: boolean;
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
}) {
  const { t, lang, digits } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const intro = method ? bilingualText(lang, method.ne ?? "", method.en ?? "") : "";
  const list = rules ?? [];
  if (!intro && list.length === 0) return null;

  const togglingEnabled = Boolean(onToggleRule);
  const isOn = (r: SaitRuleEntry) => (r.id ? (enabledRuleIds?.has(r.id) ?? true) : true);
  const ruleCount = digits(list.length);
  const offCount = togglingEnabled ? list.filter((r) => r.id && !isOn(r)).length : 0;

  return {
    open,
    toggle: () => setOpen((v) => !v),
    title: t("sait.how_this_list_is_generated"),
    subtitle:
      offCount > 0
        ? t("ui.sait.offcount_of_rulecount_rules_switched_off", { ruleCount, offCount: digits(offCount) })
        : togglingEnabled
          ? t("ui.sait.rulecount_classical_rules_switch_off_any", { ruleCount })
          : t("ui.sait.rulecount_classical_rules_with_sources", { ruleCount }),
    intro,
    hint: togglingEnabled ? t("sait.switch_off_a_rule_your_community_doesn_t_follow_the_dat") : null,
    switchLabel: t("sait.apply_this_rule"),
    rules: list.map((r, i) => {
      const toggleable = Boolean(r.id && togglingEnabled);
      const enabled = isOn(r);
      return {
        key: r.id ?? String(i),
        num: digits(i + 1),
        text: t(r.text),
        toggleable,
        enabled,
        off: toggleable && !enabled,
        setEnabled: (v: boolean) => {
          if (r.id) onToggleRule?.(r.id, v);
        },
        source: r.source ? t(r.source) : null,
        /** Sanskrit verse (Devanagari) — not translated. */
        shloka: r.shloka ?? null,
        gloss: r.gloss ? t(r.gloss) : null,
      };
    }),
    engine: engineVersion ? `${t("sait.muh_rta_engine")} ${engineVersion}` : null,
  };
}
