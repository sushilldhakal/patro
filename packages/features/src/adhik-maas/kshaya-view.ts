/**
 * Kshaya (dropped) maas, as shown by the home notice, the Dainik Kranti banner and the
 * adhik maas page. The API names the surviving month ("Poush") and the dropped one
 * ("Magha"); a kshaya year also carries two adhik months, one before and one after.
 */
import type { SpecialMonthsResponse } from "@vedic-patro/api-client";
import { formatBsCivilIsoRange } from "@vedic-patro/domain/calendar/bs-calendar";
import { lunarMonthNe } from "@vedic-patro/domain/jyotish/dainikKranti/day-helpers";

export type KshayaMaas = NonNullable<SpecialMonthsResponse["kshaya_maas"]>;

export type KshayaView = {
  startDate: string;
  endDate: string;
  /** The two months, e.g. "Poush–Magh". */
  months: string;
  /** The months plus "Kshaya", e.g. "Poush–Magh Kshaya". */
  name: string;
  /** BS span of the lunar month, ready to print. */
  range: string;
  /** "Adhik Ashwin, Adhik Falgun" — the flanking adhik months, or "" when unknown. */
  adhik: string;
};

/** The kshaya month to show, or null when the year has none. */
export function kshayaViewOf(
  k: KshayaMaas | undefined,
  { lang, digits, t }: { lang: string; digits: (v: string | number) => string; t: (key: string, values?: Record<string, unknown>) => string },
): KshayaView | null {
  if (!k?.is_kshaya || !k.month_name || !k.start_date || !k.end_date) return null;
  const isEn = lang === "en";
  const kept = lunarMonthNe(k.month_name, isEn) ?? k.month_name;
  const dropped = k.dropped_month_name ? (lunarMonthNe(k.dropped_month_name, isEn) ?? k.dropped_month_name) : "";
  const months = dropped ? `${kept}–${dropped}` : kept;
  return {
    startDate: k.start_date,
    endDate: k.end_date,
    months,
    name: t("adhik_page.kshaya_name", { months }),
    range: formatBsCivilIsoRange(k.start_date, k.end_date, lang, digits),
    adhik: (k.adhik_months ?? [])
      .map((m) => t("adhik_page.adhik_name", { month: lunarMonthNe(m.month_name, isEn) ?? m.month_name }))
      .join(", "),
  };
}
