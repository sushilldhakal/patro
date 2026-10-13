import type { PanchangaDay } from "@/lib/api";
import { formatBsDateLong } from "@vedic-patro/domain/bs-calendar";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import { windowLabel } from "@vedic-patro/domain/muhurta-now";
import { parseAdStr } from "@vedic-patro/domain/panchanga-year-page";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

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
    <div className={panchangaPageClasses.aside.card}>
      <div className={panchangaPageClasses.aside.muhurtaEyebrow}>
        {bilingualText(lang, "क्षणिक मुहूर्त", "Moment now")}
      </div>
      {instantLabel && (
        <p className={panchangaPageClasses.aside.muhurtaInstant}>
          {bilingualText(lang, `${digits(instantTime)} बजेको अवस्था`, `Status at ${digits(instantTime)}`)}
        </p>
      )}
      <ul className={cn("m-0 list-none p-0", panchangaPageClasses.aside.muhurtaList)}>
        {ROWS.map(({ key, label, labelEn }) => {
          const block = now[key];
          const active = block?.active;
          const range = windowLabel(block, digits);
          return (
            <li
              key={key}
              className={cn(
                "flex",
                panchangaPageClasses.aside.muhurtaRow,
                active ? panchangaPageClasses.aside.muhurtaRowActive : panchangaPageClasses.aside.muhurtaRowIdle
              )}
            >
              <span>
                <span className="font-semibold">{bilingualText(lang, label, labelEn)}</span>
              </span>
              <span className={panchangaPageClasses.aside.muhurtaValue}>
                {active ? (
                  <span className={panchangaPageClasses.aside.muhurtaActive}>
                    {bilingualText(lang, "सक्रिय", "Active")}
                  </span>
                ) : (
                  <span className={panchangaPageClasses.aside.muhurtaRange}>
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
    <div className={panchangaPageClasses.aside.banner}>
      <p className={panchangaPageClasses.aside.bannerTitle}>
        {bilingualText(lang, "समय-आधारित पञ्चाङ्ग", "Time-based reading")}
      </p>
      <p className={panchangaPageClasses.aside.bannerBody}>
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
