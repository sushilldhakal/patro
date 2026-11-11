/**
 * Diagrams that live on a clock rather than in the sky.
 *
 * Five figures in the Learn library were timelines drawn in monospace — a
 * sunrise, a moonrise slipping later, a तिथि boundary landing either side of
 * dawn. Box-drawing characters can put a mark on a line but they cannot put it
 * at the *right place* on that line, which is the only thing these pictures
 * are for. Each one here is laid out from the real numbers instead.
 *
 * They share a horizontal-time frame and a house style, so they sit together:
 * a rule with hour ticks, events as dots on it, and the reading underneath.
 */

import { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { FigureFrame } from "@/components/learn/figures/FigureFrame";
import { STUDY_FONT } from "@/components/learn/study/study-ink";
import { useTranslation } from "@vedic-patro/i18n/react";

/* The figures that still call bilingualText are the ones whose text is built
   around a formatted number, so they are not single catalogue strings. */
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingualText, type Lang } from "@vedic-patro/domain/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";

import { illustration } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
const INK = "currentColor";
const SUN = illustration.amber43;
const MOON = illustration.sky84;
const MARK = illustration.orange50;
const ALT = illustration.teal48;
const WARN = illustration.red60;

const digits = (lang: Lang, v: string | number) =>
  lang === "en" ? String(v) : toNepaliDigits(String(v));

/** Shared frame: a captioned SVG at a fixed aspect. */

/* ────────────────────────────────────────────────────────────────────────
   नाक्षत्र दिन vs सौर दिन — the extra ~1° that makes a solar day longer
   ──────────────────────────────────────────────────────────────────── */

/**
 * Why a solar day is four minutes longer than a rotation.
 *
 * Earth turns once in `२३h ५६m` — that is a full rotation, measured against a
 * star so distant its direction never changes. But in that time Earth has also
 * moved about `१°` along its orbit, so it must turn that extra `१°` to bring
 * the Sun back overhead. `१°` of spin is roughly four minutes, and `२३h ५६m`
 * plus four minutes is the `२४h` day a clock keeps.
 *
 * Drawn as two orbital positions rather than one, because the whole effect
 * comes from Earth having *moved* between them.
 */
export function SiderealSolarDay() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 236;
  const r = 30;
  /* The real extra turn is 1°, which at any honest scale is invisible. Drawn
     at 22° so the reader can see there *is* an angle; the label carries the
     true value, and the caption says the drawing is exaggerated. */
  const SHOWN = 22;
  const panels = [
    { cx: 150, sun: 0, mark: 0, caption: "learn.diagrams.sidereal_panel_start" },
    { cx: 400, sun: SHOWN, mark: 0, caption: "learn.diagrams.sidereal_panel_one_rotation" },
  ];
  const cy = 108;
  const pt = (cx: number, deg: number, rad: number): [number, number] => [
    cx + rad * Math.sin(deg * (Math.PI / 180)),
    cy - rad * Math.cos(deg * (Math.PI / 180)),
  ];

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.sidereal_day_label")}
      caption={t("learn.diagrams.sidereal_day_caption")}
    >
      <SvgText x={W / 2} y={18} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.6}>
        ★ {t("learn.diagrams.sidereal_star_direction")}
      </SvgText>

      {panels.map((p, i) => (
        <G key={i}>
          {/* star direction: straight up, identical in both panels */}
          <Line x1={p.cx} y1={cy - r - 4} x2={p.cx} y2={26} stroke={INK} strokeOpacity={0.3} strokeWidth={0.9} strokeDasharray="3 3" />

          <Circle cx={p.cx} cy={cy} r={r} fill={ALT} opacity={0.28} />
          <Circle cx={p.cx} cy={cy} r={r} fill="none" stroke={ALT} strokeOpacity={0.6} strokeWidth={1} />

          {/* the mark on Earth — after one rotation it is back on the star */}
          <Line
            x1={p.cx}
            y1={cy}
            x2={pt(p.cx, p.mark, r)[0]}
            y2={pt(p.cx, p.mark, r)[1]}
            stroke={INK}
            strokeOpacity={0.75}
            strokeWidth={1.6}
          />
          {/* direction to the Sun from this orbital position */}
          <Line
            x1={p.cx}
            y1={cy}
            x2={pt(p.cx, p.sun, r + 22)[0]}
            y2={pt(p.cx, p.sun, r + 22)[1]}
            stroke={SUN}
            strokeWidth={1.6}
            opacity={0.9}
          />
          <Circle cx={pt(p.cx, p.sun, r + 30)[0]} cy={pt(p.cx, p.sun, r + 30)[1]} r={7} fill={SUN} opacity={0.6} />

          <SvgText x={p.cx} y={cy + r + 26} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.65}>
            {t(p.caption)}
          </SvgText>
        </G>
      ))}

      {/* the leftover angle in the second panel */}
      <Path
        d={`M${pt(panels[1]!.cx, 0, 46)[0]} ${pt(panels[1]!.cx, 0, 46)[1]} A46 46 0 0 1 ${pt(panels[1]!.cx, SHOWN, 46)[0]} ${pt(panels[1]!.cx, SHOWN, 46)[1]}`}
        fill="none"
        stroke={MARK}
        strokeWidth={1.3}
      />
      <SvgText x={panels[1]!.cx + 54} y={cy - 46} fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {tFor(lang, "ui.learn.value_still_to_go", { value: n(1) })}
      </SvgText>

      <SvgText x={W / 2} y={H - 26} textAnchor="middle" fontSize={10} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {tFor(lang, "ui.learn.that_value_value2_more_minutes_of", { value: n(1), value2: n(4) })}
      </SvgText>
      <SvgText x={W / 2} y={H - 8} textAnchor="middle" fill="currentColor" fontSize={10} fontFamily={STUDY_FONT.semibold} opacity={0.8}>
        {t("learn.diagrams.sidereal_day_total")}
      </SvgText>
    </FigureFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   दिनमान = 2H — the hour angle either side of local noon
   ──────────────────────────────────────────────────────────────────── */

/**
 * Sunrise and sunset as one number reflected about local noon.
 *
 * The hour angle H that comes out of the sunrise equation is *half* a day.
 * Local noon sits at the middle, sunrise at noon − H and sunset at noon + H,
 * which is why one solve gives both and why day length is simply 2H.
 *
 * Two bands are drawn: a summer day and a winter one at Kathmandu's latitude,
 * because the symmetry is only interesting once you see H itself change.
 */
export function DayLengthHourAngle() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 190;
  const L = 66;
  const Rr = W - 26;
  const noon = (L + Rr) / 2;

  const rows = [
    { h: 6.92, y: 62, key: "learn.diagrams.summer_solstice", len: "~13h 50m", c: SUN },
    { h: 5.21, y: 126, key: "learn.diagrams.winter_solstice", len: "~10h 25m", c: ALT },
  ];
  /* Scale so the longer of the two fills the frame. */
  const px = (hours: number) => ((Rr - L) / 2) * (hours / 7.4);

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.day_length_label")}
      caption={t("learn.diagrams.day_length_caption")}
    >
      <Line x1={noon} y1={34} x2={noon} y2={H - 34} stroke={MARK} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.8} />
      <SvgText x={noon} y={26} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {t("learn.diagrams.local_noon")}
      </SvgText>

      {rows.map((r) => (
        <G key={r.key}>
          <SvgText x={L - 10} y={r.y + 3} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.6}>
            {t(r.key)}
          </SvgText>
          <Line
            x1={noon - px(r.h)}
            y1={r.y}
            x2={noon + px(r.h)}
            y2={r.y}
            stroke={r.c}
            strokeWidth={7}
            opacity={0.4}
            strokeLinecap="round"
          />
          {[-1, 1].map((s) => (
            <Circle key={s} cx={noon + s * px(r.h)} cy={r.y} r={3.4} fill={r.c} />
          ))}
          <SvgText x={noon - px(r.h) - 6} y={r.y + 3} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.65}>
            {t("panchanga.wheel.sunrise")}
          </SvgText>
          <SvgText x={noon + px(r.h) + 6} y={r.y + 3} fill="currentColor" fontSize={8} opacity={0.65}>
            {t("learn.diagrams.sunset")}
          </SvgText>
          <SvgText x={noon} y={r.y + 17} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.55}>
            {bilingualText(lang, tFor(undefined, "ui.learn.x_56eaf2db", { v0: n(r.len) }), `2H = ${r.len}`)}
          </SvgText>
        </G>
      ))}

      <SvgText x={noon - px(3.5)} y={H - 12} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.6}>
        ◄── H ──►
      </SvgText>
      <SvgText x={noon + px(3.5)} y={H - 12} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.6}>
        ◄── H ──►
      </SvgText>
    </FigureFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   चन्द्रोदय ~५० मिनेट ढिलो — and the day that gets none
   ──────────────────────────────────────────────────────────────────── */

/**
 * Why some days have two moonrises and some have none.
 *
 * The Moon rises roughly `५०` minutes later each day, because it has moved
 * about `१३°` along its own orbit while Earth turned. Slide an event `५०`
 * minutes later every day against a `२४`-hour grid and two things follow with
 * no extra rule: occasionally two moonrises land inside one civil day, and
 * occasionally the slip steps clean over a day and it gets none.
 *
 * The dates are the article's worked example, laid out on a real 24-hour axis
 * so the slip is a slope rather than a list.
 */
export function MoonriseSlip() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 210;
  const L = 58;
  const Rr = W - 16;
  const x = (h: number) => L + (h / 24) * (Rr - L);

  /* Successive moonrises are ~24h 50m apart — always *more* than a civil day.
     So a day can miss out entirely, but two can never fall inside one. Times
     below are one consistent run of that interval. */
  const days = [
    { d: 1, rises: [22.67] },
    { d: 2, rises: [23.5] },
    { d: 3, rises: [] },
    { d: 4, rises: [0.33] },
    { d: 5, rises: [1.17] },
  ];
  const rowY = (i: number) => 50 + i * 29;

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.moonrise_slip_label")}
      caption={t("learn.diagrams.moonrise_slip_caption")}
    >
      {[0, 6, 12, 18, 24].map((h) => (
        <G key={h}>
          <Line x1={x(h)} y1={36} x2={x(h)} y2={H - 42} stroke={INK} strokeOpacity={0.12} strokeWidth={0.7} />
          <SvgText x={x(h)} y={30} textAnchor="middle" fill="currentColor" fontSize={8} opacity={0.5}>
            {n(String(h).padStart(2, "0"))}:{n("00")}
          </SvgText>
        </G>
      ))}

      {days.map((row, i) => (
        <G key={row.d}>
          <SvgText x={L - 8} y={rowY(i) + 3} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.6}>
            {bilingualText(lang, tFor(undefined, "ui.learn.x_ca6354ee", { v0: n(row.d) }), `day ${row.d}`)}
          </SvgText>
          <Line x1={L} y1={rowY(i)} x2={Rr} y2={rowY(i)} stroke={INK} strokeOpacity={0.16} strokeWidth={0.8} />
          {row.rises.map((h) => (
            <Circle key={h} cx={x(h)} cy={rowY(i)} r={4} fill={MOON} opacity={0.95} />
          ))}
          {row.rises.length === 0 && (
            <SvgText x={(L + Rr) / 2} y={rowY(i) + 3} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
              {t("learn.diagrams.moonrise_none")}
            </SvgText>
          )}
          {/* the slip label flips inboard near the right edge, where a
              +50m sitting after the dot would run off the frame */}
          {row.rises.length === 1 && i > 0 && (
            <SvgText
              x={x(row.rises[0]!) + (row.rises[0]! > 20 ? -9 : 9)}
              y={rowY(i) + 3}
              textAnchor={row.rises[0]! > 20 ? "end" : "start"}
              fill="currentColor" fontSize={8} opacity={0.45}
            >
              +{n(50)}m
            </SvgText>
          )}
        </G>
      ))}

      <SvgText x={L} y={H - 12} fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.7}>
        {tFor(lang, "ui.learn.value_minutes_later_each_day", { value: n(50) })}
      </SvgText>
    </FigureFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   सूर्योदय नै नमुना लिने क्षण — why the तिथि of a day is fixed at dawn
   ──────────────────────────────────────────────────────────────────── */

/**
 * The panchanga samples the sky once a day, at sunrise.
 *
 * A तिथि can begin and end at any hour; the calendar needs one label per day.
 * The rule is to read whichever तिथि is running **at sunrise** and give the
 * whole day that name. So a तिथि that ends at 04:30 — before dawn — never gets
 * a day, and the one after it takes the whole day instead.
 *
 * Drawn as a strip of तिथि boundaries with one sampling arrow at sunrise,
 * which is the entire rule in one mark.
 */
export function SunriseSamplesTithi() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 172;
  const L = 26;
  const Rr = W - 20;
  const x = (h: number) => L + (h / 24) * (Rr - L);
  const barY = 74;

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.sunrise_sample_label")}
      caption={t("learn.diagrams.sunrise_sample_caption")}
    >
      {/* the तिथि strip, with a boundary before dawn and one after */}
      {[
        { a: 0, b: 4.5, key: "learn.diagrams.tithi_tritiya", c: 0.1 },
        { a: 4.5, b: 24, key: "learn.diagrams.tithi_chaturthi", c: 0.2 },
      ].map((seg) => (
        <G key={seg.key}>
          <Rect
            x={x(seg.a)}
            y={barY}
            width={x(seg.b) - x(seg.a)}
            height={26}
            fill={INK}
            opacity={seg.c}
            rx={2}
          />
          <SvgText
            x={(x(seg.a) + x(seg.b)) / 2}
            y={barY + 17}
            textAnchor="middle"
            fill="currentColor" fontSize={8} opacity={0.75}
          >
            {t(seg.key)}
          </SvgText>
        </G>
      ))}
      <Line x1={x(4.5)} y1={barY - 6} x2={x(4.5)} y2={barY + 32} stroke={WARN} strokeWidth={1.3} />
      <SvgText x={x(4.5)} y={barY - 12} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
        {bilingualText(lang, tFor(undefined, "ui.learn.tithi_changes_04_30"), `tithi changes ${n("04:30")}`)}
      </SvgText>

      {/* the sampling instant */}
      <Line x1={x(6.17)} y1={barY + 34} x2={x(6.17)} y2={barY + 56} stroke={MARK} strokeWidth={1.4} />
      <Circle cx={x(6.17)} cy={barY + 34} r={3.6} fill={MARK} />
      <SvgText x={x(6.17)} y={barY + 70} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={MARK}>
        {bilingualText(lang, tFor(undefined, "ui.learn.x_388cd0a9"), `sunrise ${n("05:45")} — sampled here`)}
      </SvgText>

      <SvgText x={L} y={30} fill="currentColor" fontSize={8} opacity={0.55}>
        {n("00:00")}
      </SvgText>
      <SvgText x={Rr} y={30} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.55}>
        {n("24:00")}
      </SvgText>
      <SvgText x={(L + Rr) / 2} y={30} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.7}>
        {t("learn.diagrams.one_civil_day")}
      </SvgText>
    </FigureFrame>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   एउटै क्षण, दुई ठाउँ, दुई फरक तिथि
   ──────────────────────────────────────────────────────────────────── */

/**
 * The same instant, two places, two different answers — and no disagreement.
 *
 * A तिथि ends at one absolute moment for the whole planet. What differs is
 * where each place's *sunrise* falls relative to it. At काठमाडौँ the boundary
 * lands before dawn, so that day takes the next तिथि; at सिड्नी it lands after
 * dawn, so that day keeps the earlier one. Both are correct, and the reason
 * both are correct is the sunrise rule, not a difference in the astronomy.
 */
export function TithiAcrossZones() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const n = (v: string | number) => digits(lang, v);
  const W = 540;
  const H = 208;
  const L = 92;
  const Rr = W - 22;
  const x = (h: number) => L + (h / 12) * (Rr - L);

  const places = [
    { key: "learn.diagrams.city_kathmandu", tz: "UTC+05:45", end: 3.75, rise: 6.17, before: true },
    { key: "learn.diagrams.city_sydney", tz: "UTC+11:00", end: 9.0, rise: 6.5, before: false },
  ];

  return (
    <FigureFrame
      w={W}
      h={H}
      label={t("learn.diagrams.tithi_zones_label")}
      caption={t("learn.diagrams.tithi_zones_caption")}
    >
      <SvgText x={W / 2} y={20} textAnchor="middle" fill="currentColor" fontSize={10} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
        {tFor(lang, "ui.learn.tithi_ends_value_utc", { value: n("22:00") })}
      </SvgText>

      {places.map((p, i) => {
        const y = 62 + i * 76;
        return (
          <G key={p.key}>
            <SvgText x={L - 10} y={y - 2} textAnchor="end" fill="currentColor" fontSize={8} fontFamily={STUDY_FONT.semibold} opacity={0.75}>
              {t(p.key)}
            </SvgText>
            <SvgText x={L - 10} y={y + 10} textAnchor="end" fill="currentColor" fontSize={8} opacity={0.5}>
              {p.tz}
            </SvgText>
            <Line x1={L} y1={y} x2={Rr} y2={y} stroke={INK} strokeOpacity={0.18} strokeWidth={0.9} />

            {/* sunrise */}
            <Circle cx={x(p.rise)} cy={y} r={3.8} fill={MARK} />
            <SvgText x={x(p.rise)} y={y - 8} textAnchor="middle" fontSize={8} fill={MARK}>
              {t("panchanga.wheel.sunrise")}
            </SvgText>

            {/* the boundary */}
            <Line x1={x(p.end)} y1={y - 14} x2={x(p.end)} y2={y + 14} stroke={WARN} strokeWidth={1.4} />
            <SvgText x={x(p.end)} y={y - 20} textAnchor="middle" fontSize={8} fontFamily={STUDY_FONT.semibold} fill={WARN}>
              {n(p.before ? "03:45" : "09:00")}
            </SvgText>

            <SvgText
              x={Rr}
              y={y + 25}
              textAnchor="end"
              fontSize={8} fontFamily={STUDY_FONT.semibold}
              fill={p.before ? WARN : MARK}
            >
              {p.before
                ? t("learn.diagrams.tithi_ended_before_sunrise")
                : t("learn.diagrams.tithi_ended_after_sunrise")}
            </SvgText>
          </G>
        );
      })}
    </FigureFrame>
  );
}
