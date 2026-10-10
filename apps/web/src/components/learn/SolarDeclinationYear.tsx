/**
 * The Sun's north–south travel across one बि.सं. year, drawn as a curve.
 *
 * This diagram exists to settle one confusion by making it visible rather than
 * by asserting it in prose: **विषुव and अयनान्त are different points on the same
 * curve**, and they are not interchangeable.
 *
 *   • **विषुव / equinox** — where the curve *crosses zero*. The Sun stands on
 *     the खगोलीय विषुवत् रेखा, day ≈ night, and its north–south motion is at its
 *     **fastest**. Twice a year: वसन्त (~चैत ६–७) and शरद् (~असोज ६–७).
 *   • **अयनान्त / solstice** — where the curve *turns*, at ±२३.४४°. The Sun
 *     halts its north–south travel and reverses — the Latin is *sol* + *sistere*,
 *     "the Sun stands still". Longest and shortest day. ग्रीष्म (~असार ६–७) and
 *     शीत (~पुष ६–७).
 *
 * The two अयनान्त are also the real hinges of the अयन: the rising half of the
 * curve is उत्तरायण, the falling half दक्षिणायन. That is why the ayana turn is
 * an अयनान्त event and not a सङ्क्रान्ति one — मकर सङ्क्रान्ति sits about २४ days
 * to the right of the शीत अयनान्त, and the gap widens with अयन चलन.
 *
 * The x-axis is deliberately the बि.सं. year rather than a Gregorian one, which
 * shows the other half of the story: the four markers do **not** sit on month
 * boundaries, and they drift against them over centuries. Months are निरयन;
 * this curve is सायन.
 *
 * Declination is the closed form δ = asin(sin ε · sin λ), with λ the Sun's
 * *tropical* longitude — exact enough at this scale, and it keeps the four
 * markers landing on the round numbers the article quotes.
 */

import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { solarMonthStarts } from "@/lib/sky3d/day-mechanics";

const W = 560;
const H = 232;
const PAD = { l: 40, r: 12, t: 30, b: 34 };

const SOLAR = "#dddd00";
const EQUINOX = "#35d05a";
const SOLSTICE = "#f59e0b";

/** Obliquity, degrees — the amplitude of the whole curve. */
const EPS = 23.44;
/**
 * Ayanamsha, degrees. बैशाख १ is निरयन longitude ०°, so the Sun's *tropical*
 * longitude there is the ayanamsha itself — which is exactly why the सायन
 * markers land inside the months they do rather than on बैशाख १.
 */
const AYANAMSHA = 24;
const DAYS = 365;
/** Earth's orbital eccentricity — what makes the बि.सं. months unequal. */
const ECCENTRICITY = 0.0167;

const D2R = Math.PI / 180;
/** Tropical longitude of the Sun, degrees, at a given day of the बि.सं. year. */
const lambdaAt = (day: number) => AYANAMSHA + (day / DAYS) * 360;
/** δ = asin(sin ε · sin λ). */
const declAt = (day: number) =>
  Math.asin(Math.sin(EPS * D2R) * Math.sin(lambdaAt(day) * D2R)) / D2R;
/** Day of the बि.सं. year at which the Sun reaches tropical longitude λ. */
const dayOfLambda = (lambda: number) => (((lambda - AYANAMSHA + 360) % 360) / 360) * DAYS;

interface Marker {
  lambda: number;
  kind: "equinox" | "solstice";
  /** Catalogue key for the marker name — resolved at render, not at module load. */
  key: string;
  /** Catalogue key for the approximate date this marker falls on. */
  whenKey: string;
}

/** The four turning points, in the order the बि.सं. year meets them. */
const MARKERS: Marker[] = [
  { lambda: 90, kind: "solstice", key: "learn.study.summer_solstice", whenKey: "learn.study.declination.when_summer_solstice" },
  { lambda: 180, kind: "equinox", key: "learn.study.autumn_equinox", whenKey: "learn.study.declination.when_autumn_equinox" },
  { lambda: 270, kind: "solstice", key: "learn.study.winter_solstice", whenKey: "learn.study.declination.when_winter_solstice" },
  { lambda: 0, kind: "equinox", key: "learn.study.spring_equinox", whenKey: "learn.study.declination.when_spring_equinox" },
];

export function SolarDeclinationYear() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v));

  const x = (day: number) => PAD.l + (day / DAYS) * (W - PAD.l - PAD.r);
  const y = (deg: number) => {
    const h = H - PAD.t - PAD.b;
    return PAD.t + h / 2 - (deg / (EPS * 1.28)) * (h / 2);
  };

  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i += 1) {
      const day = (i / 240) * DAYS;
      pts.push(`${i ? "L" : "M"}${x(day).toFixed(1)} ${y(declAt(day)).toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  /* Real बि.सं. month boundaries, not twelve equal slices. A month is 30° of the
     Sun's travel, and the Sun runs faster near उपसौर — so the months are 30–32
     days long and the ruler underneath is genuinely uneven. Drawing it evenly
     would hide the same eccentricity the curve is riding on. */
  const monthStarts = useMemo(() => solarMonthStarts(ECCENTRICITY, DAYS), []);
  const monthNames = ne ? BS_MONTHS_NE : ([...BS_MONTH_NAMES] as string[]);

  const solsticeDays = MARKERS.filter((m) => m.kind === "solstice").map((m) => dayOfLambda(m.lambda));
  const [summerDay, winterDay] = solsticeDays as [number, number];

  return (
    <figure className="m-0 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={t("learn.study.declination.aria")}
      >
        {/* दक्षिणायन shading: the falling half, ग्रीष्म → शीत अयनान्त */}
        <rect
          x={x(summerDay)}
          y={PAD.t}
          width={x(winterDay) - x(summerDay)}
          height={H - PAD.t - PAD.b}
          fill={SOLSTICE}
          opacity={0.055}
        />
        <text
          x={(x(summerDay) + x(winterDay)) / 2}
          y={PAD.t - 16}
          textAnchor="middle"
          className="fill-current text-[9px] font-semibold opacity-60"
        >
          {t("learn.study.declination.dakshinayana")}
        </text>
        {/* उत्तरायण is the rising half, and a बि.सं. year opens partway through
            it — so it shows as two flanks either side of दक्षिणायन, not one
            block. Labelling only the right one would read as though बैशाख–असार
            belonged to neither ayana. */}
        {[
          [PAD.l, x(summerDay)],
          [x(winterDay), W - PAD.r],
        ].map(([a, b]) => (
          <text
            key={a}
            x={(a! + b!) / 2}
            y={PAD.t - 16}
            textAnchor="middle"
            className="fill-current text-[9px] font-semibold opacity-60"
          >
            {t("learn.study.declination.uttarayana")}
          </text>
        ))}

        {/* ±२३.४४° and the equator */}
        {[EPS, 0, -EPS].map((d) => (
          <g key={d}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(d)}
              y2={y(d)}
              stroke={d === 0 ? EQUINOX : "currentColor"}
              strokeOpacity={d === 0 ? 0.5 : 0.16}
              strokeWidth={d === 0 ? 1 : 0.6}
              strokeDasharray={d === 0 ? undefined : "3 3"}
            />
            <text
              x={PAD.l - 5}
              y={y(d) + 3}
              textAnchor="end"
              className="fill-current text-[8px] tabular-nums opacity-55"
            >
              {d === 0 ? num(0) : `${d > 0 ? "+" : "−"}${num(EPS)}°`}
            </text>
          </g>
        ))}

        {/* बि.सं. months — the निरयन ruler the सायन curve drifts against */}
        {monthStarts.map((d, i) => (
          <g key={i}>
            <line
              x1={x(d)}
              x2={x(d)}
              y1={PAD.t}
              y2={H - PAD.b + 3}
              stroke="currentColor"
              strokeOpacity={i === 0 ? 0.32 : 0.12}
              strokeWidth={0.7}
            />
            <text
              x={x((d + (i === 11 ? DAYS : monthStarts[i + 1]!)) / 2)}
              y={H - PAD.b + 13}
              textAnchor="middle"
              className="fill-current text-[7.5px] opacity-50"
            >
              {monthNames[i]}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke={SOLAR} strokeWidth={1.9} strokeLinejoin="round" />

        {MARKERS.map((m) => {
          const day = dayOfLambda(m.lambda);
          const deg = declAt(day);
          const colour = m.kind === "equinox" ? EQUINOX : SOLSTICE;
          /* Solstice labels ride above/below their peak, equinox labels sit off
             the zero line — otherwise all four collide in the middle band. */
          const above = m.kind === "solstice" ? deg > 0 : true;
          const edge = day > DAYS * 0.86;
          return (
            <g key={m.key}>
              <circle cx={x(day)} cy={y(deg)} r={3.4} fill={colour} />
              <text
                x={x(day) + (edge ? -6 : 6)}
                y={y(deg) + (above ? -8 : 15)}
                textAnchor={edge ? "end" : "start"}
                className="text-[8.5px] font-semibold"
                style={{ fill: colour }}
              >
                {t(m.key)}
              </text>
              <text
                x={x(day) + (edge ? -6 : 6)}
                y={y(deg) + (above ? 0 : 23)}
                textAnchor={edge ? "end" : "start"}
                className="fill-current text-[7.5px] opacity-55"
              >
                {t(m.whenKey)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1.5 text-[11px] leading-snug text-white/45">
        {t("learn.study.declination.caption")}
      </figcaption>
    </figure>
  );
}

export default SolarDeclinationYear;
