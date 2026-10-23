/**
 * The home page's one-line "this year's adhik maas" notice, shared by the
 * website's `components/home/AdhikMaasNotice.tsx` and the app's
 * `components/home/AdhikMaasNotice.tsx`: which lunar month is adhik in the
 * BS year, its span, and the way into the adhik maas page. A kshaya (dropped)
 * month is announced the same way, as its own item. Nothing is shown when the
 * year has neither or the lookup fails.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSpecialMonths, specialMonthsKeys } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES, BS_MONTHS_NE, formatBsCivilIsoRange } from "@vedic-patro/domain/calendar/bs-calendar";
import { useLocale } from "@vedic-patro/i18n/react";
import { kshayaViewOf } from "../adhik-maas/kshaya-view";

/** The engine spells Baisakh "Baishakh"; every other month matches `BS_MONTH_NAMES`. */
function monthIndexOf(name: string): number {
  const key = name.trim().toLowerCase().replace("baishakh", "baisakh");
  return BS_MONTH_NAMES.findIndex((m) => m.toLowerCase() === key);
}

export function useAdhikMaasNotice(bsYear: number) {
  const { t, lang, digits } = useLocale();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: specialMonthsKeys.year(bsYear),
    queryFn: () => fetchSpecialMonths(bsYear),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const isEn = lang === "en";
  const year = digits(bsYear);
  const items: Array<{ key: string; start: string; short: string; label: string; detail: string; extra?: string; why: string }> = [];

  const adhikMonths = data?.adhik_months ?? (data?.adhik_maas ? [data.adhik_maas] : []);
  for (const adhik of adhikMonths) {
    if (!adhik.has_adhik_maas || !adhik.month_name || !adhik.start_date || !adhik.end_date) continue;
    const i = monthIndexOf(adhik.month_name);
    const month = i < 0 ? adhik.month_name : isEn ? BS_MONTH_NAMES[i]! : BS_MONTHS_NE[i]!;
    const range = formatBsCivilIsoRange(adhik.start_date, adhik.end_date, lang, digits);
    items.push({
      key: `adhik-${adhik.start_date}`,
      start: adhik.start_date,
      short: t("adhik_page.adhik_name", { month }),
      label: t("ui.home.adhik_maas_label", { year, month }),
      detail: t("ui.home.adhik_maas_detail", { month, range }),
      why: t("ui.home.adhik_maas_why"),
    });
  }

  const kshaya = kshayaViewOf(data?.kshaya_maas, { lang, digits, t });
  if (kshaya) {
    items.push({
      key: "kshaya",
      start: kshaya.startDate,
      short: kshaya.name,
      label: t("ui.home.kshaya_maas_label", { year, month: kshaya.months }),
      detail: t("ui.home.kshaya_maas_detail", { month: kshaya.months, range: kshaya.range }),
      extra: kshaya.adhik ? t("ui.home.kshaya_maas_adhik", { adhik: kshaya.adhik }) : undefined,
      why: t("ui.home.kshaya_maas_why"),
    });
  }

  if (items.length === 0) return null;
  items.sort((x, y) => x.start.localeCompare(y.start));

  return {
    /** The row's headline — one month named in full, or all of them in order (BS 2039: adhik, kshaya, adhik). */
    label:
      items.length === 1
        ? items[0]!.label
        : t("ui.home.special_months_label", { year, list: items.map((i) => i.short).join(" · ") }),
    items,
    moreLabel: t("ui.home.adhik_maas_more"),
    /** The BS year the adhik maas page opens on. */
    year: bsYear,
    open,
    toggle: () => setOpen((v) => !v),
  };
}
