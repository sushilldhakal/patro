/**
 * Diagrams for the counting arguments: cycles, drifts and corrections.
 *
 * These five figures were each a small table or a hand-drawn ruler in
 * monospace. What they have in common is that the *quantity* is the point —
 * how far a calendar has slipped, how wide an eclipse window is, how a
 * seven-step cycle lands three places along. A number set in a <pre> is still
 * just a number; drawn to scale it becomes an argument.
 */

import { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { FigureFrame } from "@/components/learn/figures/FigureFrame";
import { STUDY_FONT } from "@/components/learn/study/study-ink";
import { useTranslation } from "@vedic-patro/i18n/react";

/* The figures that still call bilingualText are the ones whose text is built
   around a formatted number, so they are not single catalogue strings. */
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
const SUN = illustration.amber43;

const digits = (lang: Lang, v: string | number) =>
  lang === "en" ? String(v) : toNepaliDigits(String(v));


/* ── वार — 24 horas, and why tomorrow starts three places along ──────── */

/**
 * The weekday order is not arbitrary; it falls out of counting horas.
 *
 * The seven ग्रह sit in a fixed cycle by classical orbital period — शनि,
 * बृहस्पति, मंगल, सूर्य, शुक्र, बुध, चन्द्र — and each hour of the day is ruled
 * by the next one along. A day holds `२४` horas, and `२४ ÷ ७` leaves `३`, so
 * the *next* day's first hora sits **three** places further round the ring.
 *
 * Step three at a time and the ring emits सूर्य → चन्द्र → मंगल → बुध →
 * बृहस्पति → शुक्र → शनि, which is exactly the week. The diagram draws both:
 * the ring in period order, and the three-step chords that generate the week
 * from it.
 */
export function HoraWeekdayCycle() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const S = 300;
  const C = S / 2;
  const R = 104;

  /* Classical order by period, slowest first — the hora sequence. The labels
     are abbreviated to fit the ring, so only the three that are already short
     share a key with the canonical graha names. */
  const RING = [
    "learn.diagrams.hora_ring_saturn",
    "learn.diagrams.hora_ring_jupiter",
    "learn.diagrams.graha_mars",
    "grahas.sun",
    "learn.diagrams.hora_ring_venus",
    "learn.diagrams.hora_ring_mercury",
    "grahas.moon",
  ];
  const at = (i: number, r: number): [number, number] => {
    const a = ((i / 7) * 360 - 90) * (Math.PI / 180);
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };
  /* Start at सूर्य (index 3) and step *three* each time — 24 mod 7 = 3 — which
     emits सूर्य, चन्द्र, मंगल, बुध, बृहस्पति, शुक्र, शनि: the week exactly.
     The figure this replaced said "24 ÷ 7 = 3 बाँकी 4"; the remainder is 3.
     Counted inclusively the landing place is the fourth along, which is
     probably where the 4 came from, but as a step it is 3. */
  const week = Array.from({ length: 7 }, (_, k) => (3 + k * 3) % 7);

  return (
    <FigureFrame
      w={S}
      h={S}
      label={t("learn.diagrams.hora_cycle_label")}
      caption={t("learn.diagrams.hora_cycle_caption")}
    >
      {/* the three-step chords that generate the week */}
      {week.map((idx, k) => {
        const nxt = week[(k + 1) % 7]!;
        const [x1, y1] = at(idx, R - 16);
        const [x2, y2] = at(nxt, R - 16);
        return <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={MARK} strokeWidth={0.9} opacity={0.4} />;
      })}

      <Circle cx={C} cy={C} r={R} fill="none" stroke={INK} strokeOpacity={0.16} strokeWidth={0.8} />

      {RING.map((key, i) => {
        const [x, y] = at(i, R);
        const order = week.indexOf(i) + 1;
        return (
          <G key={key}>
            <Circle cx={x} cy={y} r={15} fill={INK} opacity={0.07} />
            <Circle cx={x} cy={y} r={15} fill="none" stroke={MARK} strokeOpacity={0.45} strokeWidth={0.9} />
            <SvgText x={x} y={y + 3} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.85}>
              {t(key)}
            </SvgText>
            <SvgText
              x={at(i, R + 25)[0]}
              y={at(i, R + 25)[1] + 3}
              textAnchor="middle"
              fontSize={8} fontFamily={STUDY_FONT.semibold}
              fill={MARK}
            >
              {n(order)}
            </SvgText>
          </G>
        );
      })}

      <SvgText x={C} y={C - 6} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
        {t("learn.diagrams.hora_cycle_remainder")}
      </SvgText>
      <SvgText x={C} y={C + 8} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {t("learn.diagrams.hora_cycle_step")}
      </SvgText>
    </FigureFrame>
  );
}

/* ── लीप वर्ष — the 0.0078 day the Julian rule overpays ──────────────── */

/**
 * Three year-lengths side by side, and what the difference buys.
 *
 * The Julian mean year is `३६५.२५००` days and the true tropical year
 * `३६५.२४२२`. The rule therefore overpays by `०.००७८` days a year — small
 * enough to ignore for a lifetime, and by `१५८२` it had put the equinox ten
 * days adrift. The Gregorian correction drops three leap days every four
 * centuries and lands at `३६५.२४२५`, which is close enough to lose a day only
 * once in about three thousand years.
 *
 * Bars are drawn against the *excess*, not the absolute length: at absolute
 * scale all three are the same bar.
 */
export function YearLengthLadder() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 176;
  const L = 128;
  const zero = L + 40;
  const scale = 4400;

  const rows = [
    { key: "learn.diagrams.year_length_row_julian", len: "365.2500", excess: 0.0078, c: WARN },
    { key: "learn.diagrams.year_length_row_gregorian", len: "365.2425", excess: 0.0003, c: GOOD },
    { key: "learn.diagrams.year_length_row_true", len: "365.2422", excess: 0, c: INK },
  ];

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.year_length_label")}
      caption={t("learn.diagrams.year_length_caption")}
    >
      <Line x1={zero} y1={30} x2={zero} y2={H - 46} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />
      <SvgText x={zero} y={24} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.55}>
        {t("learn.diagrams.year_length_zero_error")}
      </SvgText>

      {rows.map((r, i) => {
        const y = 48 + i * 30;
        const w = r.excess * scale;
        return (
          <G key={r.key}>
            <SvgText x={L - 6} y={y + 3} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.65}>
              {t(r.key)}
            </SvgText>
            <SvgText x={L + 2} y={y + 3} fill="currentColor" fontSize={8} opacity={0.8}>
              {n(r.len)}
            </SvgText>
            {w > 0 && <Rect x={zero} y={y - 6} width={w} height={12} fill={r.c} opacity={0.45} rx={1.5} />}
            {w > 0 && (
              <SvgText x={zero + w + 6} y={y + 3} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={r.c}>
                +{n(r.excess.toFixed(4))} {t("learn.diagrams.year_length_excess_unit")}
              </SvgText>
            )}
          </G>
        );
      })}

      <SvgText x={zero} y={H - 26} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
        {tFor(lang, "ui.learn.julian_1_day_per_value_years", { value: n(128), value2: n(1582) })}
      </SvgText>
      <SvgText x={zero} y={H - 10} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={GOOD}>
        {t("learn.diagrams.year_length_gregorian_drift")}
      </SvgText>
    </FigureFrame>
  );
}

/* ── अक्टोबर १५८२ — the ten days that never happened ─────────────────── */

/**
 * The Gregorian jump, and the three centuries it took to spread.
 *
 * Ten days were struck out of October 1582 so the equinox would land back
 * where the Julian rule had promised. The calendar went straight from the
 * `४`th to the `१५`th — no day in between existed anywhere that adopted it.
 *
 * The second half of the diagram is the part the date alone hides: adoption
 * was staggered over `३४१` years, and because the Julian error kept running,
 * each late adopter had to strike out *more* days than the last. Britain lost
 * eleven, Russia thirteen.
 */
export function GregorianJump() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 196;
  const cell = 26;
  const startX = 92;

  const before = [1, 2, 3, 4];
  const after = [15, 16, 17, 18];
  const adopters = [
    { y: 1582, days: 10, key: "learn.diagrams.country_italy_spain_portugal" },
    { y: 1752, days: 11, key: "learn.diagrams.country_britain" },
    { y: 1918, days: 13, key: "learn.diagrams.country_russia" },
    { y: 1923, days: 13, key: "learn.diagrams.country_greece" },
  ];

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.gregorian_jump_label")}
      caption={t("learn.diagrams.gregorian_jump_caption")}
    >
      <SvgText x={startX} y={22} fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
        {t("learn.diagrams.gregorian_jump_month")}
      </SvgText>

      {[...before, ...after].map((d, i) => {
        const gap = i >= before.length ? 18 : 0;
        const x = startX + i * cell + gap;
        return (
          <G key={d}>
            <Rect x={x} y={34} width={cell - 4} height={cell - 4} fill={INK} opacity={0.08} rx={2.5} />
            <SvgText x={x + (cell - 4) / 2} y={34 + (cell - 4) / 2 + 3.5} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.8}>
              {n(d)}
            </SvgText>
          </G>
        );
      })}

      {/* the seam */}
      <Line
        x1={startX + before.length * cell + 7}
        y1={30}
        x2={startX + before.length * cell + 7}
        y2={34 + cell + 4}
        stroke={WARN}
        strokeWidth={2}
      />
      <SvgText x={startX + before.length * cell + 14} y={34 + cell + 16} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
        {t("learn.diagrams.gregorian_jump_lost_days")}
      </SvgText>

      {/* staggered adoption */}
      {adopters.map((a, i) => {
        const y = 112 + i * 20;
        return (
          <G key={a.y}>
            <SvgText x={startX} y={y} fill="currentColor" fontSize={8} opacity={0.7}>
              {n(a.y)}
            </SvgText>
            <Rect x={startX + 40} y={y - 7} width={a.days * 7} height={9} fill={WARN} opacity={0.34} rx={1.5} />
            <SvgText x={startX + 40 + a.days * 7 + 6} y={y} fill="currentColor" fontSize={8} opacity={0.65}>
              {n(a.days)} {t("common.days")} · {t(a.key)}
            </SvgText>
          </G>
        );
      })}
    </FigureFrame>
  );
}

/* ── ग्रहण ऋतु — the ~34-day window ──────────────────────────────────── */

/**
 * Why eclipses arrive in pairs, about two weeks apart.
 *
 * An eclipse needs the Sun near a node of the Moon's orbit, and the Sun spends
 * roughly `३४` days close enough — that window is the ग्रहण ऋतु. A औंसी and a
 * पूर्णिमा are always about `१४` days apart, so a `३४`-day window almost always
 * catches at least one of each: a solar eclipse at new Moon and a lunar one at
 * full.
 *
 * The whole argument is a comparison of two durations, which is why it is
 * drawn to scale rather than listed.
 */
export function EclipseSeasonWindow() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 176;
  const L = 60;
  const Rr = W - 40;
  const x = (d: number) => L + (d / 34) * (Rr - L);

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.eclipse_season_label")}
      caption={t("learn.diagrams.eclipse_season_caption")}
    >
      <Rect x={L} y={54} width={Rr - L} height={30} fill={MARK} opacity={0.16} rx={3} />
      <SvgText x={(L + Rr) / 2} y={44} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {tFor(lang, "ui.learn.eclipse_season_value_days", { value: n(34) })}
      </SvgText>
      {[L, Rr].map((v) => (
        <Line key={v} x1={v} y1={50} x2={v} y2={88} stroke={MARK} strokeWidth={1.3} />
      ))}

      {[
        {
          d: 9,
          fill: midnight.card,
          phase: "learn.diagrams.eclipse_phase_new_moon",
          event: "learn.diagrams.eclipse_event_solar",
        },
        {
          d: 23,
          fill: wheel.ink,
          phase: "learn.diagrams.eclipse_phase_full_moon",
          event: "learn.diagrams.eclipse_event_lunar",
        },
      ].map((m) => (
        <G key={m.phase}>
          <Circle cx={x(m.d)} cy={69} r={8} fill={m.fill} stroke={INK} strokeOpacity={0.4} strokeWidth={0.8} />
          <SvgText x={x(m.d)} y={104} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
            {t(m.phase)}
          </SvgText>
          <SvgText x={x(m.d)} y={117} textAnchor="middle" fontSize={8} fill={COOL}>
            {t(m.event)}
          </SvgText>
        </G>
      ))}

      <Line x1={x(9)} y1={134} x2={x(23)} y2={134} stroke={COOL} strokeWidth={1} opacity={0.7} />
      {[9, 23].map((d) => (
        <Line key={d} x1={x(d)} y1={130} x2={x(d)} y2={138} stroke={COOL} strokeWidth={1} opacity={0.7} />
      ))}
      <SvgText x={(x(9) + x(23)) / 2} y={150} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={COOL}>
        {tFor(lang, "ui.learn.value_days", { value: n(14) })}
      </SvgText>
    </FigureFrame>
  );
}

/* ── किरणको कोण — the same sunlight over different ground ────────────── */

/**
 * Why a slanting beam heats less: it is the same light over more ground.
 *
 * Two beams of identical width strike the surface, one steeply and one at a
 * shallow angle. The steep beam lands on a short footprint, the shallow one
 * spreads across a long one. Nothing about the light changed — only the area
 * it had to cover, and therefore the energy each patch of ground receives.
 *
 * Drawn with genuinely equal beam widths, since the whole claim is that the
 * *input* is identical and only the footprint differs.
 */
export function SunRayAngle() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const W = 540;
  const H = 210;
  const ground = 150;

  /** Beam of a fixed width arriving at `deg` from vertical. */
  function beam(cx: number, deg: number, width: number) {
    const a = deg * (Math.PI / 180);
    const foot = width / Math.cos(a);
    const dx = Math.tan(a) * (ground - 30);
    return {
      rays: [-0.5, -0.166, 0.166, 0.5].map((f) => ({
        x1: cx + f * width - dx,
        y1: 30,
        x2: cx + f * foot,
        y2: ground,
      })),
      x1: cx - foot / 2,
      x2: cx + foot / 2,
      foot,
    };
  }

  const steep = beam(148, 12, 74);
  const shallow = beam(392, 62, 74);

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.ray_angle_label")}
      caption={t("learn.diagrams.ray_angle_caption")}
    >
      {[
        {
          b: steep,
          cx: 148,
          angle: "learn.diagrams.ray_steep",
          result: "learn.diagrams.ray_steep_result",
        },
        {
          b: shallow,
          cx: 392,
          angle: "learn.diagrams.ray_slant",
          result: "learn.diagrams.ray_slant_result",
        },
      ].map((p) => (
        <G key={p.angle}>
          <SvgText x={p.cx} y={20} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
            {t(p.angle)}
          </SvgText>
          {p.b.rays.map((r, i) => (
            <Line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={SUN} strokeWidth={1.6} opacity={0.75} />
          ))}
          {/* the footprint the beam actually lands on */}
          <Line x1={p.b.x1} y1={ground} x2={p.b.x2} y2={ground} stroke={MARK} strokeWidth={5} opacity={0.85} strokeLinecap="round" />
          <SvgText x={p.cx} y={ground + 20} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
            {lang === "en"
              ? `footprint ×${(p.b.foot / 74).toFixed(1)}`
              : tFor(undefined, "ui.learn.x_89e72363", { v0: digits(lang, (p.b.foot / 74).toFixed(1)) })}
          </SvgText>
          <SvgText x={p.cx} y={ground + 36} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.7}>
            {t(p.result)}
          </SvgText>
        </G>
      ))}

      <Line x1={20} y1={ground} x2={W - 20} y2={ground} stroke={INK} strokeOpacity={0.4} strokeWidth={1.2} />
    </FigureFrame>
  );
}
