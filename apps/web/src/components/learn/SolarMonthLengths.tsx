/**
 * Why a बि.सं. month is 29–32 days long, drawn from the real calendar.
 *
 * A सौर मास is not a count of days — it is `३०°` of the Sun's travel along the
 * राशि belt, from one सङ्क्रान्ति to the next. The Sun does not travel at a
 * constant rate: near **उपसौर** (पुष–माघ) Earth is closest and the Sun's
 * apparent motion is fastest, so those `३०°` are crossed in fewer days; near
 * **अपसौर** (असार) it crawls, and the month stretches.
 *
 * So the bar chart is the orbit's eccentricity, read off the calendar: the
 * short months cluster around उपसौर and the long ones around अपसौर, and the
 * whole pattern is a single slow wave rather than an arbitrary table anyone
 * had to memorise.
 *
 * Lengths come from `getBSMonthLength` — the same table the patro itself uses,
 * not a model — averaged over a decade so one year's rounding does not read as
 * a rule. The fractional averages are what show the wave; a single year would
 * be a staircase of integers.
 */

import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";
import {
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  BS_SUPPORTED_END_YEAR,
  getBSMonthLength,
} from "@/lib/bs-calendar";

const W = 560;
const H = 210;
const PAD = { l: 30, r: 12, t: 26, b: 40 };

const LONG = "#f59e0b";
const SHORT = "#0ea5e9";
const MID = "#8fb6d8";

/** Months sampled per bar — enough that the fractional mean is stable. */
const SAMPLE_YEARS = 10;

export function SolarMonthLengths() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v));
  const monthNames = ne ? BS_MONTHS_NE : ([...BS_MONTH_NAMES] as string[]);

  /** Mean length of each महिना over the last decade the tables cover. */
  const lengths = useMemo(() => {
    const endYear = BS_SUPPORTED_END_YEAR - 1;
    return Array.from({ length: 12 }, (_, m) => {
      let total = 0;
      for (let y = endYear - SAMPLE_YEARS; y < endYear; y += 1) {
        total += getBSMonthLength(y, m + 1);
      }
      return total / SAMPLE_YEARS;
    });
  }, []);

  const lo = 28.6;
  const hi = 32.4;
  const x = (i: number) => PAD.l + ((i + 0.5) / 12) * (W - PAD.l - PAD.r);
  const y = (d: number) => {
    const h = H - PAD.t - PAD.b;
    return PAD.t + h - ((d - lo) / (hi - lo)) * h;
  };
  const barW = ((W - PAD.l - PAD.r) / 12) * 0.62;

  /* Highlight the months that *contain* अपसौर and उपसौर, not the longest and
     shortest bars. असार and साउन tie at 31.4 exactly, so picking by length
     would hand the label to whichever indexOf reached first — and the caption
     is making a claim about where Earth is in its orbit, not about which bar
     won. Aphelion lands असार १९–२२ and perihelion पुष १८–२०. */
  const longest = 2; // असार
  const shortest = 8; // पुष

  return (
    <figure className="m-0 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={t("learn.study.month_lengths.aria")}
      >
        {[29, 30, 31, 32].map((d) => (
          <g key={d}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(d)}
              y2={y(d)}
              stroke="currentColor"
              strokeOpacity={0.13}
              strokeWidth={0.6}
              strokeDasharray="3 3"
            />
            <text
              x={PAD.l - 5}
              y={y(d) + 3}
              textAnchor="end"
              className="fill-current text-[8px] tabular-nums opacity-55"
            >
              {num(d)}
            </text>
          </g>
        ))}

        {lengths.map((d, i) => {
          const colour = i === longest ? LONG : i === shortest ? SHORT : MID;
          const strong = i === longest || i === shortest;
          return (
            <g key={i}>
              <rect
                x={x(i) - barW / 2}
                y={y(d)}
                width={barW}
                height={H - PAD.b - y(d)}
                fill={colour}
                opacity={strong ? 0.85 : 0.42}
                rx={1.5}
              />
              <text
                x={x(i)}
                y={y(d) - 4}
                textAnchor="middle"
                className="fill-current text-[7.5px] tabular-nums"
                style={{ opacity: strong ? 0.9 : 0.5 }}
              >
                {num(d.toFixed(1))}
              </text>
              <text
                x={x(i)}
                y={H - PAD.b + 12}
                textAnchor="middle"
                className="fill-current text-[7.5px]"
                style={{ opacity: strong ? 0.95 : 0.5 }}
                fontWeight={strong ? 700 : 400}
              >
                {monthNames[i]}
              </text>
            </g>
          );
        })}

        <text
          x={x(shortest)}
          y={H - PAD.b + 25}
          textAnchor="middle"
          className="text-[7.5px] font-semibold"
          style={{ fill: SHORT }}
        >
          {t("learn.study.month_lengths.perihelion")}
        </text>
        <text
          x={x(longest)}
          y={H - PAD.b + 25}
          textAnchor="middle"
          className="text-[7.5px] font-semibold"
          style={{ fill: LONG }}
        >
          {t("learn.study.month_lengths.aphelion")}
        </text>
      </svg>
      <figcaption className="mt-1.5 text-[11px] leading-snug text-white/45">
        {t("learn.study.month_lengths.caption")}
      </figcaption>
    </figure>
  );
}

export default SolarMonthLengths;
