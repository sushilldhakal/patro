import { useQuery } from "@tanstack/react-query";
import { adToBS, bsToAD, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { fetchGocharIngress } from "@/lib/api";

/** A stretch of the BS year with Jupiter in Simha, as "कात्तिक १४" labels. */
export type SimhasthaSpan = { from: string; to: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * When Jupiter is in sidereal Simha during a BS year (सिंहस्थ गुरु), from the engine's own rashi
 * ingresses. The vivah rule bars those months, so the page says why they are empty and that the rule
 * can be switched off. Asked only when `enabled` (the ceremony has the rule and it is on).
 */
export function useSimhasthaSpans(bsYear: number, enabled: boolean, lang: string, digits: (n: number | string) => string) {
  const start = bsToAD(bsYear, 1, 1);
  const end = new Date(bsToAD(bsYear + 1, 1, 1).getTime() - 86_400_000);
  const query = useQuery({
    queryKey: ["sait", "simhastha", bsYear],
    enabled,
    staleTime: 7 * 24 * 3600_000,
    queryFn: () => fetchGocharIngress(iso(start), iso(end), undefined, { level: "rashi" }),
  });

  const label = (d: Date) => {
    const bs = adToBS(d);
    const month = lang === "en" ? BS_MONTH_NAMES[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
    return `${month} ${digits(bs.day)}`;
  };

  const spans: SimhasthaSpan[] = [];
  const events = (query.data?.events ?? []).filter((e) => e.graha === "jupiter");
  let open: Date | null = events[0]?.from_rashi === "Simha" ? start : null;
  for (const e of events) {
    const at = new Date(e.entry_time_utc ?? e.entry_time_local);
    if (e.to_rashi === "Simha") open = at;
    else if (e.from_rashi === "Simha" && open) {
      spans.push({ from: label(open), to: label(at) });
      open = null;
    }
  }
  if (open) spans.push({ from: label(open), to: label(end) });
  return spans;
}
