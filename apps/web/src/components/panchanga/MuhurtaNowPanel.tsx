import type { MuhurtaNowBlock, PanchangaDay } from "@/lib/api";
import { formatBsDateLong } from "@/lib/bs-calendar";
import { formatTimeShort } from "@/lib/panchanga-format";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";

function parseAdStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function windowLabel(
  block: MuhurtaNowBlock | null | undefined,
  digits: (v: string | number) => string,
): string | undefined {
  if (!block) return undefined;
  const start = formatTimeShort(block.start_time ?? block.start_local);
  const end = formatTimeShort(block.end_time ?? block.end_local);
  if (start && end) return `${digits(start)} – ${digits(end)}`;
  return start ? digits(start) : undefined;
}

const ROWS: { key: keyof NonNullable<PanchangaDay["muhurta_now"]>; label: string; labelEn: string }[] =
  [
    { key: "rahu_kalam", label: "राहु काल", labelEn: "Rahu Kalam" },
    { key: "yamaganda", label: "यमगण्ड", labelEn: "Yamaganda" },
    { key: "gulika", label: "गुलिक", labelEn: "Gulika" },
    { key: "abhijit", label: "अभिजित", labelEn: "Abhijit" },
  ];

interface Props {
  p: PanchangaDay;
  clock?: string;
  /** Civil AD date (YYYY-MM-DD) the user is viewing — not necessarily today. */
  viewedDateAd?: string;
}

export function MuhurtaNowPanel({ p, clock }: Props) {
  const { lang, digits } = useLocale();
  const now = p.muhurta_now;
  if (!now) return null;

  const instantLabel = p.query_instant_local ?? clock;
  const instantTime = instantLabel ? (instantLabel.split(" ")[1] ?? instantLabel) : "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-base uppercase tracking-[0.12em] mb-1">
        {bilingualText(lang, "क्षणिक मुहूर्त", "Moment now")}
      </div>
      {instantLabel && (
        <p className="text-sm mb-3 m-0">
          {bilingualText(lang, `${digits(instantTime)} बजेको अवस्था`, `Status at ${digits(instantTime)}`)}
        </p>
      )}
      <ul className="space-y-2 m-0 p-0 list-none">
        {ROWS.map(({ key, label, labelEn }) => {
          const block = now[key];
          const active = block?.active;
          const range = windowLabel(block, digits);
          return (
            <li
              key={key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm",
                active ? "bg-secondary/20 text-secondary" : "bg-muted/40"
              )}
            >
              <span>
                <span className="font-semibold">{bilingualText(lang, label, labelEn)}</span>
              </span>
              <span className="text-right shrink-0 font-semibold">
                {active ? (
                  <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                    {bilingualText(lang, "सक्रिय", "Active")}
                  </span>
                ) : (
                  <span className="text-xs font-mono tabular-nums">
                    {range ?? "—"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EphemerisModeBanner({ p, clock, viewedDateAd }: Props) {
  const { digits, lang } = useLocale();
  const time = p.query_instant_local?.split(" ")[1] ?? clock;
  const civil = p.before_sunrise_of_civil_day;
  const viewedAd = viewedDateAd ?? p.query_instant_local?.split(" ")[0];
  const viewedDateLabel = viewedAd
    ? formatBsDateLong(parseAdStr(viewedAd), lang, digits)
    : null;
  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm">
      <p className="m-0 font-semibold text-foreground">
        {bilingualText(lang, "समय-आधारित पञ्चाङ्ग", "Time-based reading")}
      </p>
      <p className="m-0 mt-1 text-foreground text-sm leading-relaxed">
        {time ? (
          bilingualNode(lang, <>
              <span className="font-mono tabular-nums">{digits(time)}</span> बजेको वास्तविक
              ग्रहस्थितिअनुसार तिथि, नक्षत्र, योग र करण। आकाशगङ्गाका ग्रहहरूको सटीक गणनामा
              आधारित भएकाले मुद्रित सिद्धान्तिक पात्रोसँग केही मात्रामा नमिल्न सक्छ।
            </>,
            <>
              Tithi, nakshatra, yoga and karana from the actual planetary positions at{" "}
              <span className="font-mono tabular-nums">{digits(time)}</span>. Based on precise
              sky calculations, so it may differ slightly from printed theoretical patros.
            </>,
          )
        ) : (
          bilingualText(lang, 
            "तोकिएको समयको वास्तविक ग्रहस्थितिअनुसार तिथि, नक्षत्र, योग र करण। आकाशगङ्गाका ग्रहहरूको सटीक गणनामा आधारित भएकाले मुद्रित सिद्धान्तिक पात्रोसँग केही मात्रामा नमिल्न सक्छ।",
            "Tithi, nakshatra, yoga and karana from the actual planetary positions at the chosen time. Based on precise sky calculations, so it may differ slightly from printed theoretical patros.",
          )
        )}
        {civil &&
          (viewedDateLabel
            ? bilingualText(lang, 
                ` यो समय ${viewedDateLabel} को सूर्योदय अघि भएकाले ${viewedDateLabel} को वैदिक दिनको पञ्चाङ्ग देखाइँदैछ।`,
                ` This time is before sunrise on ${viewedDateLabel}, so ${viewedDateLabel}'s Vedic day almanac is shown.`,
              )
            : bilingualText(lang, 
                " यो समय हेर्दै गरेको मितिको सूर्योदय अघि भएकाले सोही मितिको वैदिक दिनको पञ्चाङ्ग देखाइँदैछ।",
                " This time is before sunrise on the viewed date, so that date's Vedic day almanac is shown.",
              ))}
      </p>
    </div>
  );
}
