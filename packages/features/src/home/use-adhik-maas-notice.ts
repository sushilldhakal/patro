/**
 * The home page's one-line "this year's adhik maas" notice, shared by the
 * website's `components/home/AdhikMaasNotice.tsx` and the app's
 * `components/home/AdhikMaasNotice.tsx`: which lunar month is adhik in the
 * BS year, its span, and the way into the adhik maas page. Nothing is
 * shown when the year has no adhik maas or the lookup fails.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSpecialMonths, specialMonthsKeys } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES, BS_MONTHS_NE, formatBsCivilIsoRange } from "@vedic-patro/domain/calendar/bs-calendar";
import { useLocale } from "@vedic-patro/i18n/react";

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

  const adhik = data?.adhik_maas;
  if (!adhik?.has_adhik_maas || !adhik.month_name || !adhik.start_date || !adhik.end_date) return null;

  const isEn = lang === "en";
  const i = monthIndexOf(adhik.month_name);
  const month = i < 0 ? adhik.month_name : isEn ? BS_MONTH_NAMES[i]! : BS_MONTHS_NE[i]!;
  const year = digits(bsYear);
  const range = formatBsCivilIsoRange(adhik.start_date, adhik.end_date, lang, digits);

  return {
    label: t("ui.home.adhik_maas_label", { year, month }),
    detail: t("ui.home.adhik_maas_detail", { month, range }),
    why: t("ui.home.adhik_maas_why"),
    moreLabel: t("ui.home.adhik_maas_more"),
    /** The BS year the adhik maas page opens on. */
    year: bsYear,
    open,
    toggle: () => setOpen((v) => !v),
  };
}
