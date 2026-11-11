/**
 * The last of the monospace figures: apparent motion, and the shape of a month.
 *
 * What is left after the timelines and the frame diagrams are two kinds of
 * picture — how a graha's apparent path is built up from circles, and how a
 * lunar month divides. Both were drawn with box characters, and both are
 * really about proportion, which box characters cannot hold.
 */

import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText, TSpan } from "react-native-svg";
import { FigureFrame } from "@/components/learn/figures/FigureFrame";
import { STUDY_FONT } from "@/components/learn/study/study-ink";
import { useTranslation } from "@vedic-patro/i18n/react";

/* PakshaStrip still calls bilingualText for its one caption built around a
   formatted number; everything else now comes from the catalogue. */
import { useLocale } from "@vedic-patro/i18n/react";
import { type Lang } from "@vedic-patro/domain/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";

import { illustration, midnight, wheel } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
const INK = "currentColor";
const MARK = illustration.orange50;
const WARN = illustration.red60;
const COOL = illustration.teal48;
const GOOD = illustration.green51;
const MOONLIT = wheel.ink;

const digits = (lang: Lang, v: string | number) =>
  lang === "en" ? String(v) : toNepaliDigits(String(v));


/* ── वक्री गति — the loop, drawn from the two orbits that make it ────── */

/**
 * Retrograde motion as a projection, not a reversal.
 *
 * Earth on the inner orbit overtakes मंगल on the outer one. Sightlines drawn
 * from Earth to मंगल at equal intervals sweep forward, pause, sweep *backward*
 * through the overtaking, then resume — and the loop is where those sightlines
 * land on the sky, not anywhere either planet went.
 *
 * The sightlines are the whole explanation, so they are the thing drawn: the
 * apparent path along the top is derived from where they point, which is the
 * honest way round.
 */
export function RetrogradeLoop() {
  const { t } = useTranslation();
  const W = 540;
  const H = 250;
  const sunX = W / 2;
  const sunY = 178;
  const rE = 46;
  const rM = 86;
  const skyY = 40;

  /* Equal steps of time; Earth runs about twice Mars's angular rate. */
  const steps = Array.from({ length: 9 }, (_, i) => {
    const step = (i - 4) * 0.34;
    const e = -90 + step * 57;
    const m = -90 + step * 30;
    const D2R = Math.PI / 180;
    const ex = sunX + rE * Math.cos(e * D2R);
    const ey = sunY + rE * Math.sin(e * D2R) * 0.42;
    const mx = sunX + rM * Math.cos(m * D2R);
    const my = sunY + rM * Math.sin(m * D2R) * 0.42;
    /* Where the sightline through Mars meets the backdrop. */
    const k = (skyY - ey) / (my - ey);
    return { ex, ey, mx, my, sx: ex + k * (mx - ex), i };
  });

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.retrograde_label")}
      caption={t("learn.diagrams.retrograde_caption")}
    >
      {/* the backdrop of fixed stars */}
      <Line x1={16} y1={skyY} x2={W - 16} y2={skyY} stroke={INK} strokeOpacity={0.22} strokeWidth={1} />
      <SvgText x={16} y={skyY - 8} fill="currentColor" fontSize={8} opacity={0.55}>
        {t("learn.diagrams.retrograde_star_backdrop")}
      </SvgText>

      {/* orbits */}
      {[rE, rM].map((r) => (
        <Ellipse key={r} cx={sunX} cy={sunY} rx={r} ry={r * 0.42} fill="none" stroke={INK} strokeOpacity={0.18} strokeWidth={0.8} />
      ))}
      <Circle cx={sunX} cy={sunY} r={8} fill={illustration.amber43} opacity={0.6} />

      {steps.map((s) => {
        const retro = s.i >= 3 && s.i <= 5;
        return (
          <G key={s.i}>
            <Line
              x1={s.ex}
              y1={s.ey}
              x2={s.sx}
              y2={skyY}
              stroke={retro ? WARN : COOL}
              strokeWidth={retro ? 1.1 : 0.7}
              opacity={retro ? 0.75 : 0.35}
            />
            <Circle cx={s.ex} cy={s.ey} r={3} fill={COOL} opacity={0.9} />
            <Circle cx={s.mx} cy={s.my} r={3.4} fill={WARN} opacity={0.8} />
            <Circle cx={s.sx} cy={skyY} r={2.6} fill={retro ? WARN : INK} opacity={retro ? 0.95 : 0.4} />
          </G>
        );
      })}

      <SvgText x={sunX - rE - 8} y={sunY + 26} textAnchor="end" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={COOL}>
        {t("learn.diagrams.retrograde_earth_faster")}
      </SvgText>
      <SvgText x={sunX + rM + 8} y={sunY + 26} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
        {t("learn.diagrams.retrograde_mars_slower")}
      </SvgText>
      <SvgText x={W / 2} y={H - 8} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
        {t("learn.diagrams.retrograde_red_span")}
      </SvgText>
    </FigureFrame>
  );
}

/* ── मन्द र शीघ्र — the two ancient corrections ──────────────────────── */

/**
 * How the siddhantas made a uniform circle fit an unequal sky.
 *
 * A मध्यम ग्रह moves at a dead-constant rate around a circle — easy to compute
 * and wrong on the sky. Two corrections fix it. The **मन्द** term accounts for
 * the orbit not being centred on us, which is one hump per revolution. The
 * **शीघ्र** term accounts for our own motion around the Sun, which is what
 * produces the retrograde loop.
 *
 * Applied in turn they turn the flat line into the स्फुट ग्रह — the true
 * position. Drawn as three stacked curves so each correction's contribution is
 * separable, which is exactly how the texts applied them.
 */
export function MandaShighra() {
  const { t } = useTranslation();
  const W = 540;
  const H = 264;
  /* Labels sit above each row, so the curves can run the full width. */
  const L = 16;
  const Rr = W - 20;
  const x = (f: number) => L + f * (Rr - L);

  const rows = [
    {
      y: 50,
      title: "learn.diagrams.manda_row_mean",
      sub: "learn.diagrams.manda_row_mean_note",
      c: INK,
      f: () => 0,
    },
    {
      y: 130,
      title: "learn.diagrams.manda_row_manda",
      sub: "learn.diagrams.manda_row_manda_note",
      c: MARK,
      f: (f: number) => Math.sin(f * Math.PI * 2) * 15,
    },
    {
      y: 220,
      title: "learn.diagrams.manda_row_shighra",
      sub: "learn.diagrams.manda_row_shighra_note",
      c: WARN,
      f: (f: number) => Math.sin(f * Math.PI * 2) * 15 + Math.sin(f * Math.PI * 6) * 13,
    },
  ];

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.manda_shighra_label")}
      caption={t("learn.diagrams.manda_shighra_caption")}
    >
      {rows.map((r) => (
        <G key={r.title}>
          <SvgText x={L} y={r.y - 34} fill="currentColor" fontSize={8}>
            <TSpan fontFamily={STUDY_FONT.semibold} fillOpacity={0.75}>{t(r.title)}</TSpan>
            <TSpan fillOpacity={0.55}> · {t(r.sub)}</TSpan>
          </SvgText>
          <Line x1={L} y1={r.y} x2={Rr} y2={r.y} stroke={INK} strokeOpacity={0.12} strokeWidth={0.7} strokeDasharray="3 3" />
          <Path
            d={Array.from({ length: 97 }, (_, i) => {
              const f = i / 96;
              return `${i ? "L" : "M"}${x(f).toFixed(1)} ${(r.y - r.f(f)).toFixed(1)}`;
            }).join(" ")}
            fill="none"
            stroke={r.c}
            strokeWidth={1.7}
            opacity={r.c === INK ? 0.5 : 0.9}
          />
        </G>
      ))}
      <SvgText x={Rr} y={H - 6} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.45}>
        {t("learn.diagrams.one_revolution_axis")}
      </SvgText>
    </FigureFrame>
  );
}

/* ── पक्ष — one lunation cut in two ──────────────────────────────────── */

/**
 * The two halves of a lunar month, and where the तिथि numbering restarts.
 *
 * A lunation runs औंसी → पूर्णिमा → औंसी. The waxing half is शुक्ल पक्ष and
 * the waning half कृष्ण, each holding fifteen तिथि — so the count runs १–१५
 * twice rather than १–३० once, which is the detail the table alone never made
 * obvious.
 *
 * Moon discs are drawn at their real illuminated fraction across the strip, so
 * the numbering and the phase line up by construction.
 */
export function PakshaStrip() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 176;
  const L = 26;
  const Rr = W - 20;
  const midY = 84;
  const x = (f: number) => L + f * (Rr - L);

  const discs = Array.from({ length: 9 }, (_, i) => i / 8);

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.paksha_strip_label")}
      caption={t("learn.diagrams.paksha_strip_caption")}
    >
      <Rect x={x(0)} y={midY - 4} width={x(0.5) - x(0)} height={8} fill={MOONLIT} opacity={0.5} rx={2} />
      <Rect x={x(0.5)} y={midY - 4} width={x(1) - x(0.5)} height={8} fill={INK} opacity={0.16} rx={2} />

      {discs.map((f) => {
        /* Illuminated fraction over the lunation, 0 at new, 1 at full. */
        const lit = (1 - Math.cos(f * Math.PI * 2)) / 2;
        const cx = x(f);
        return (
          <G key={f}>
            <Circle cx={cx} cy={midY - 32} r={9} fill={midnight.card} stroke={INK} strokeOpacity={0.3} strokeWidth={0.7} />
            {lit > 0.02 && (
              <Path
                d={
                  lit >= 0.98
                    ? `M${cx} ${midY - 41} A9 9 0 1 1 ${cx - 0.01} ${midY - 41} Z`
                    : `M${cx} ${midY - 41} A9 9 0 0 ${f < 0.5 ? 1 : 0} ${cx} ${midY - 23} A${9 * Math.abs(1 - 2 * lit)} 9 0 0 ${lit > 0.5 ? (f < 0.5 ? 1 : 0) : f < 0.5 ? 0 : 1} ${cx} ${midY - 41} Z`
                }
                fill={MOONLIT}
                opacity={0.92}
              />
            )}
          </G>
        );
      })}

      {[
        {
          f: 0.25,
          title: "learn.diagrams.paksha_shukla",
          sub: "learn.diagrams.paksha_tithi_range",
          c: GOOD,
        },
        {
          f: 0.75,
          title: "learn.diagrams.paksha_krishna",
          sub: "learn.diagrams.paksha_tithi_range",
          c: COOL,
        },
      ].map((p) => (
        <G key={p.title}>
          <SvgText x={x(p.f)} y={midY + 26} textAnchor="middle" fontSize={10} fontFamily={STUDY_FONT.semibold} fill={p.c}>
            {t(p.title)}
          </SvgText>
          <SvgText x={x(p.f)} y={midY + 39} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.6}>
            {t(p.sub)}
          </SvgText>
        </G>
      ))}

      {[
        { f: 0, phase: "learn.diagrams.phase_new_short" },
        { f: 0.5, phase: "learn.diagrams.phase_full_short" },
        { f: 1, phase: "learn.diagrams.phase_new_short" },
      ].map((m, i) => (
        <G key={i}>
          <Line x1={x(m.f)} y1={midY - 12} x2={x(m.f)} y2={midY + 10} stroke={MARK} strokeWidth={1.2} />
          <SvgText x={x(m.f)} y={midY + 58} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
            {t(m.phase)}
          </SvgText>
        </G>
      ))}

      <SvgText x={W / 2} y={H - 6} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.45}>
        {tFor(lang, "ui.learn.one_lunation_value_days", { value: n("29.53") })}
      </SvgText>
    </FigureFrame>
  );
}
