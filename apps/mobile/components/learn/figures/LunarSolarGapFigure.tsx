/**
 * चान्द्र मास र ११ दिनको समस्या — why a lunisolar calendar needs अधिक मास.
 *
 * Twelve चान्द्र मास come to `३५४.४` days; the सौर वर्ष is `३६५.२४`. The
 * shortfall is `१०.८७` days a year, and the diagram exists to show what that
 * does when you let it run: three bars, each a year, the lunar one finishing
 * earlier every time, with the gap drawn as the thing that grows.
 *
 * By the third year the accumulated gap is `३२.६` days — longer than a चान्द्र
 * मास. That is the whole argument for अधिक मास in one picture: once the debt
 * exceeds a month you can pay it back by inserting a month, and the two cycles
 * come back into step.
 *
 * Bars rather than a ring, because the point is *accumulation*: a ring would
 * show the offset but hide the fact that it compounds.
 */

import { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { FigureFrame } from "@/components/learn/figures/FigureFrame";
import { STUDY_FONT } from "@/components/learn/study/study-ink";
import { useTranslation } from "@vedic-patro/i18n/react";

import { useLocale } from "@vedic-patro/i18n/react";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";

import { illustration } from "@vedic-patro/design-tokens";
const W = 560;
const H = 226;
const PAD = { l: 74, r: 54, t: 30, b: 30 };

const LUNAR = illustration.sky84;
const SOLAR = illustration.amber43;
const GAP = illustration.red60;

/** Mean synodic month, days. */
const SYNODIC = 29.5306;
/** Twelve of them. */
const LUNAR_YEAR = SYNODIC * 12;
/** Mean tropical year, days. */
const SOLAR_YEAR = 365.2422;
const DRIFT = SOLAR_YEAR - LUNAR_YEAR;

const YEARS = 3;
/** Widest thing on the x-axis: three solar years. */
const SPAN = SOLAR_YEAR * YEARS;

export function LunarSolarGap() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v));

  const x = (days: number) => PAD.l + (days / SPAN) * (W - PAD.l - PAD.r);
  const rowH = (H - PAD.t - PAD.b) / YEARS;
  const barH = rowH * 0.36;

  return (
    <FigureFrame w={W} h={H} label={t("learn.study.lunar_gap.aria")} caption={t("learn.study.lunar_gap.caption")}>
        {/* Each row is left-aligned and *cumulative*: row i runs from day 0 to
            the end of year i+1. Anchoring every row at zero is what makes the
            red gap visibly grow 10.9 → 21.8 → 32.6 rather than reading as a
            staircase of three separate years. */}
        {Array.from({ length: YEARS }, (_, i) => {
          const top = PAD.t + i * rowH;
          const lunarEnd = LUNAR_YEAR * (i + 1);
          const solarEnd = SOLAR_YEAR * (i + 1);
          const gap = solarEnd - lunarEnd;
          return (
            <G key={i}>
              <SvgText
                x={PAD.l - 8}
                y={top + rowH / 2 - 2}
                textAnchor="end"
                fill="currentColor" fontSize={8} opacity={0.6}
              >
                {t("learn.study.lunar_gap.after_years", { years: num(i + 1) })}
              </SvgText>

              {/* सौर वर्ष — the reference length */}
              <Rect
                x={x(0)}
                y={top + 2}
                width={x(solarEnd) - x(0)}
                height={barH}
                fill={SOLAR}
                opacity={0.32}
                rx={1.5}
              />
              {/* चान्द्र मास — one tick each, so the shortfall is countable */}
              {Array.from({ length: 12 * (i + 1) }, (_, k) => (
                <Rect
                  key={k}
                  x={x(SYNODIC * k) + 0.5}
                  y={top + barH + 6}
                  width={Math.max(1, x(SYNODIC) - PAD.l - 1)}
                  height={barH}
                  fill={LUNAR}
                  opacity={0.38}
                  rx={1}
                />
              ))}

              {/* the shortfall, drawn where it actually opens up */}
              <Rect
                x={x(lunarEnd)}
                y={top + 2}
                width={x(solarEnd) - x(lunarEnd)}
                height={barH * 2 + 4}
                fill={GAP}
                opacity={0.3}
              />
              <Line
                x1={x(lunarEnd)}
                x2={x(lunarEnd)}
                y1={top}
                y2={top + rowH - 6}
                stroke={GAP}
                strokeWidth={1.1}
                strokeDasharray="2.5 2.5"
                opacity={0.85}
              />
              <SvgText
                x={x(solarEnd) + 5}
                y={top + barH + 6}
                fontSize={8} fontFamily={STUDY_FONT.semibold}
                fill={GAP}
              >
                {num(gap.toFixed(1))}
              </SvgText>
            </G>
          );
        })}

        {/* legend */}
        <G>
          <Rect x={PAD.l} y={10} width={9} height={7} fill={SOLAR} opacity={0.45} rx={1} />
          <SvgText x={PAD.l + 13} y={16.5} fill="currentColor" fontSize={8} opacity={0.65}>
            {t("learn.study.lunar_gap.legend_solar_year")}
          </SvgText>
          <Rect x={PAD.l + 132} y={10} width={9} height={7} fill={LUNAR} opacity={0.5} rx={1} />
          <SvgText x={PAD.l + 145} y={16.5} fill="currentColor" fontSize={8} opacity={0.65}>
            {t("learn.study.lunar_gap.legend_lunar_months")}
          </SvgText>
          <Rect x={PAD.l + 290} y={10} width={9} height={7} fill={GAP} opacity={0.35} rx={1} />
          <SvgText x={PAD.l + 303} y={16.5} fill="currentColor" fontSize={8} opacity={0.65}>
            {t("learn.study.lunar_gap.legend_drift", { days: num(DRIFT.toFixed(2)) })}
          </SvgText>
        </G>

        <SvgText
          x={W - PAD.r}
          y={H - 10}
          textAnchor="end"
          fontSize={8} fontFamily={STUDY_FONT.semibold}
          fill={GAP}
        >
          {t("learn.study.lunar_gap.three_year_total", { days: num((DRIFT * 3).toFixed(1)) })}
        </SvgText>
      </FigureFrame>
  );
}

export default LunarSolarGap;
