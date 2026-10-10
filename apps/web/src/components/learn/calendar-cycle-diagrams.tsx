/**
 * Diagrams for the counting arguments: cycles, drifts and corrections.
 *
 * These five figures were each a small table or a hand-drawn ruler in
 * monospace. What they have in common is that the *quantity* is the point —
 * how far a calendar has slipped, how wide an eclipse window is, how a
 * seven-step cycle lands three places along. A number set in a <pre> is still
 * just a number; drawn to scale it becomes an argument.
 */

import { useTranslation } from "react-i18next";

/* The figures that still call bilingualText are the ones whose text is built
   around a formatted number, so they are not single catalogue strings. */
import { bilingualText, useLocale, type Lang } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";

const INK = "currentColor";
const MARK = "#f59e0b";
const WARN = "#ef4444";
const COOL = "#0ea5e9";
const GOOD = "#35d05a";
const SUN = "#dddd00";

const digits = (lang: Lang, v: string | number) =>
  lang === "en" ? String(v) : toNepaliDigits(String(v));

function Frame({
  w,
  h,
  label,
  caption,
  children,
}: {
  w: number;
  h: number;
  label: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0 w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label={label}>
        {children}
      </svg>
      <figcaption className="mt-1.5 text-[11px] leading-snug text-white/45">{caption}</figcaption>
    </figure>
  );
}

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
    <Frame
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
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={MARK} strokeWidth={0.9} opacity={0.4} />;
      })}

      <circle cx={C} cy={C} r={R} fill="none" stroke={INK} strokeOpacity={0.16} strokeWidth={0.8} />

      {RING.map((key, i) => {
        const [x, y] = at(i, R);
        const order = week.indexOf(i) + 1;
        return (
          <g key={key}>
            <circle cx={x} cy={y} r={15} fill={INK} opacity={0.07} />
            <circle cx={x} cy={y} r={15} fill="none" stroke={MARK} strokeOpacity={0.45} strokeWidth={0.9} />
            <text x={x} y={y + 3} textAnchor="middle" className="fill-current text-[8px] font-semibold opacity-85">
              {t(key)}
            </text>
            <text
              x={at(i, R + 25)[0]}
              y={at(i, R + 25)[1] + 3}
              textAnchor="middle"
              className="text-[8px] font-semibold"
              style={{ fill: MARK }}
            >
              {n(order)}
            </text>
          </g>
        );
      })}

      <text x={C} y={C - 6} textAnchor="middle" className="fill-current text-[8.5px] font-semibold opacity-75">
        {t("learn.diagrams.hora_cycle_remainder")}
      </text>
      <text x={C} y={C + 8} textAnchor="middle" className="text-[8px] font-semibold" style={{ fill: MARK }}>
        {t("learn.diagrams.hora_cycle_step")}
      </text>
    </Frame>
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
    <Frame
      w={W}
      h={H}
      label={t("learn.diagrams.year_length_label")}
      caption={t("learn.diagrams.year_length_caption")}
    >
      <line x1={zero} y1={30} x2={zero} y2={H - 46} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />
      <text x={zero} y={24} textAnchor="middle" className="fill-current text-[7.5px] opacity-55">
        {t("learn.diagrams.year_length_zero_error")}
      </text>

      {rows.map((r, i) => {
        const y = 48 + i * 30;
        const w = r.excess * scale;
        return (
          <g key={r.key}>
            <text x={L - 6} y={y + 3} textAnchor="end" className="fill-current text-[8px] opacity-65">
              {t(r.key)}
            </text>
            <text x={L + 2} y={y + 3} className="fill-current text-[8px] tabular-nums opacity-80">
              {n(r.len)}
            </text>
            {w > 0 && <rect x={zero} y={y - 6} width={w} height={12} fill={r.c} opacity={0.45} rx={1.5} />}
            {w > 0 && (
              <text x={zero + w + 6} y={y + 3} className="text-[7.5px] font-semibold" style={{ fill: r.c }}>
                +{n(r.excess.toFixed(4))} {t("learn.diagrams.year_length_excess_unit")}
              </text>
            )}
          </g>
        );
      })}

      <text x={zero} y={H - 26} className="text-[8px] font-semibold" style={{ fill: WARN }}>
        {bilingualText(lang, `जुलियन: ~१ दिन प्रति ${n(128)} वर्ष → ${n(1582)} सम्ममा १० दिन`, `Julian: ~1 day per ${n(128)} years → ten days by ${n(1582)}`)}
      </text>
      <text x={zero} y={H - 10} className="text-[8px] font-semibold" style={{ fill: GOOD }}>
        {t("learn.diagrams.year_length_gregorian_drift")}
      </text>
    </Frame>
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
    <Frame
      w={W}
      h={H}
      label={t("learn.diagrams.gregorian_jump_label")}
      caption={t("learn.diagrams.gregorian_jump_caption")}
    >
      <text x={startX} y={22} className="fill-current text-[8.5px] font-semibold opacity-75">
        {t("learn.diagrams.gregorian_jump_month")}
      </text>

      {[...before, ...after].map((d, i) => {
        const gap = i >= before.length ? 18 : 0;
        const x = startX + i * cell + gap;
        return (
          <g key={d}>
            <rect x={x} y={34} width={cell - 4} height={cell - 4} fill={INK} opacity={0.08} rx={2.5} />
            <text x={x + (cell - 4) / 2} y={34 + (cell - 4) / 2 + 3.5} textAnchor="middle" className="fill-current text-[8.5px] tabular-nums opacity-80">
              {n(d)}
            </text>
          </g>
        );
      })}

      {/* the seam */}
      <line
        x1={startX + before.length * cell + 7}
        y1={30}
        x2={startX + before.length * cell + 7}
        y2={34 + cell + 4}
        stroke={WARN}
        strokeWidth={2}
      />
      <text x={startX + before.length * cell + 14} y={34 + cell + 16} className="text-[8px] font-semibold" style={{ fill: WARN }}>
        {t("learn.diagrams.gregorian_jump_lost_days")}
      </text>

      {/* staggered adoption */}
      {adopters.map((a, i) => {
        const y = 112 + i * 20;
        return (
          <g key={a.y}>
            <text x={startX} y={y} className="fill-current text-[8px] tabular-nums opacity-70">
              {n(a.y)}
            </text>
            <rect x={startX + 40} y={y - 7} width={a.days * 7} height={9} fill={WARN} opacity={0.34} rx={1.5} />
            <text x={startX + 40 + a.days * 7 + 6} y={y} className="fill-current text-[8px] opacity-65">
              {n(a.days)} {t("common.days")} · {t(a.key)}
            </text>
          </g>
        );
      })}
    </Frame>
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
    <Frame
      w={W}
      h={H}
      label={t("learn.diagrams.eclipse_season_label")}
      caption={t("learn.diagrams.eclipse_season_caption")}
    >
      <rect x={L} y={54} width={Rr - L} height={30} fill={MARK} opacity={0.16} rx={3} />
      <text x={(L + Rr) / 2} y={44} textAnchor="middle" className="text-[8.5px] font-semibold" style={{ fill: MARK }}>
        {bilingualText(lang, `ग्रहण ऋतु — ~${n(34)} दिन`, `eclipse season — ~${n(34)} days`)}
      </text>
      {[L, Rr].map((v) => (
        <line key={v} x1={v} y1={50} x2={v} y2={88} stroke={MARK} strokeWidth={1.3} />
      ))}

      {[
        {
          d: 9,
          fill: "#1b2430",
          phase: "learn.diagrams.eclipse_phase_new_moon",
          event: "learn.diagrams.eclipse_event_solar",
        },
        {
          d: 23,
          fill: "#e8eef6",
          phase: "learn.diagrams.eclipse_phase_full_moon",
          event: "learn.diagrams.eclipse_event_lunar",
        },
      ].map((m) => (
        <g key={m.phase}>
          <circle cx={x(m.d)} cy={69} r={8} fill={m.fill} stroke={INK} strokeOpacity={0.4} strokeWidth={0.8} />
          <text x={x(m.d)} y={104} textAnchor="middle" className="fill-current text-[8px] font-semibold opacity-75">
            {t(m.phase)}
          </text>
          <text x={x(m.d)} y={117} textAnchor="middle" className="text-[7.5px]" style={{ fill: COOL }}>
            {t(m.event)}
          </text>
        </g>
      ))}

      <line x1={x(9)} y1={134} x2={x(23)} y2={134} stroke={COOL} strokeWidth={1} opacity={0.7} />
      {[9, 23].map((d) => (
        <line key={d} x1={x(d)} y1={130} x2={x(d)} y2={138} stroke={COOL} strokeWidth={1} opacity={0.7} />
      ))}
      <text x={(x(9) + x(23)) / 2} y={150} textAnchor="middle" className="text-[8px] font-semibold" style={{ fill: COOL }}>
        {bilingualText(lang, `~${n(14)} दिन`, `~${n(14)} days`)}
      </text>
    </Frame>
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
    <Frame
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
        <g key={p.angle}>
          <text x={p.cx} y={20} textAnchor="middle" className="fill-current text-[8.5px] font-semibold opacity-75">
            {t(p.angle)}
          </text>
          {p.b.rays.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={SUN} strokeWidth={1.6} opacity={0.75} />
          ))}
          {/* the footprint the beam actually lands on */}
          <line x1={p.b.x1} y1={ground} x2={p.b.x2} y2={ground} stroke={MARK} strokeWidth={5} opacity={0.85} strokeLinecap="round" />
          <text x={p.cx} y={ground + 20} textAnchor="middle" className="text-[8px] font-semibold" style={{ fill: MARK }}>
            {lang === "en"
              ? `footprint ×${(p.b.foot / 74).toFixed(1)}`
              : `क्षेत्रफल ×${digits(lang, (p.b.foot / 74).toFixed(1))}`}
          </text>
          <text x={p.cx} y={ground + 36} textAnchor="middle" className="fill-current text-[8px] opacity-70">
            {t(p.result)}
          </text>
        </g>
      ))}

      <line x1={20} y1={ground} x2={W - 20} y2={ground} stroke={INK} strokeOpacity={0.4} strokeWidth={1.2} />
    </Frame>
  );
}
