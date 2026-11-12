/**
 * One figure per page of the Goladhyaya calculation chapter.
 *
 * The numbers live in the article. These drawings only show the shape of
 * the step: which way the wheel turns, which bar is longer, where the
 * remainder sits, which angle is the correction.
 */
import type { ReactNode } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { illustration } from "@vedic-patro/design-tokens";

const INK = "currentColor";
const SUN = illustration.amber61;
const TEAL = illustration.teal48;
const MARK = illustration.orange50;
const GOOD = illustration.green51;
const RED = illustration.red60;
const PALE = illustration.amber89;

function Frame({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return (
    <figure className="m-0 w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-label={label}>
        <rect x={0} y={0} width={w} height={h} rx={16} fill={INK} opacity={0.04} />
        {children}
      </svg>
    </figure>
  );
}

function Label({ x, y, text, anchor = "middle", fill = INK, size = 13 }: { x: number; y: number; text: string; anchor?: "middle" | "start" | "end"; fill?: string; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={size} fontWeight={600}>
      {text}
    </text>
  );
}

export function PotterWheel() {
  const { t } = useLocale();
  const cx = 168;
  const cy = 142;
  return (
    <Frame w={560} h={280} label={t("learn_gola.the_potter_s_wheel")}>
      <circle cx={cx} cy={cy} r={108} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.35} />
      <circle cx={cx} cy={cy} r={78} fill="none" stroke={TEAL} strokeWidth={1.25} strokeDasharray="4 6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={cx + Math.cos(a) * 96} cy={cy + Math.sin(a) * 96} r={3.2} fill={INK} opacity={0.75} />;
      })}
      <path d="M168 28 A114 114 0 0 1 268 90" fill="none" stroke={TEAL} strokeWidth={3} markerEnd="url(#ss-west)" />
      <circle cx={cx} cy={cy} r={18} fill={SUN} />
      <circle cx={cx - 46} cy={cy + 28} r={7} fill={MARK} />
      <path d="M122 170 q18 16 8 28" fill="none" stroke={MARK} strokeWidth={2.5} />
      <polygon points="128,196 140,202 130,208" fill={MARK} />
      <Label x={300} y={78} text={t("learn_gola.west_the_sky_s_daily_motion")} anchor="start" fill={TEAL} />
      <Label x={300} y={108} text={t("learn_gola.east_the_planet_s_slow_motion")} anchor="start" fill={MARK} />
      <Label x={cx} y={148} text={t("learn_gola.earth")} size={11} />
      <defs>
        <marker id="ss-west" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={TEAL} />
        </marker>
      </defs>
    </Frame>
  );
}

export function SolarDayFigure() {
  const { t } = useLocale();
  return (
    <Frame w={560} h={250} label={t("learn_gola.sidereal_day_and_solar_day")}>
      <EarthAt x={140} sun={0} star={0} />
      <EarthAt x={390} sun={-32} star={0} extra />
      <Label x={140} y={222} text={t("learn_gola.rising_together")} />
      <Label x={390} y={222} text={t("learn_gola.star_returns_59_asu")} />
      <Label x={248} y={36} text={t("learn_gola.star")} anchor="start" size={12} />
      <circle cx={236} cy={32} r={4} fill={TEAL} />
      <Label x={360} y={36} text={t("learn_gola.sun")} anchor="start" size={12} fill={SUN} />
      <circle cx={348} cy={32} r={5} fill={SUN} />
    </Frame>
  );
}

function EarthAt({ x, sun, star, extra = false }: { x: number; sun: number; star: number; extra?: boolean }) {
  const y = 118;
  const r = 62;
  const pt = (deg: number, out: number) => {
    const a = (deg * Math.PI) / 180;
    return [x + Math.cos(a) * (r + out), y + Math.sin(a) * (r + out)] as const;
  };
  const together = sun === star;
  const [sx, sy] = pt(sun, together ? 10 : 16);
  const [tx, ty] = pt(star, together ? 26 : 16);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.45} />
      <line x1={x - r} y1={y} x2={x + r} y2={y} stroke={INK} strokeWidth={1} opacity={0.25} />
      {extra ? (
        <path d={`M ${tx} ${ty} A 78 78 0 0 0 ${sx} ${sy}`} fill="none" stroke={MARK} strokeWidth={2.5} />
      ) : null}
      <circle cx={tx} cy={ty} r={4.5} fill={TEAL} />
      <circle cx={sx} cy={sy} r={7} fill={SUN} />
    </g>
  );
}

export function MonthBars() {
  const { t } = useLocale();
  const x0 = 168;
  const span = 340;
  const at = (days: number) => x0 + ((days - 29) / 1.7) * span;
  const rows = [
    { y: 58, days: 30, label: t("learn_gola.savana_30"), color: TEAL },
    { y: 118, days: 30.438, label: t("learn_gola.solar_30_44"), color: SUN },
    { y: 178, days: 29.531, label: t("learn_gola.lunar_29_53"), color: MARK },
  ];
  return (
    <Frame w={560} h={240} label={t("learn_gola.the_three_month_lengths")}>
      <line x1={at(29)} y1={28} x2={at(29)} y2={210} stroke={INK} strokeWidth={1} opacity={0.2} />
      <line x1={at(30.7)} y1={28} x2={at(30.7)} y2={210} stroke={INK} strokeWidth={1} opacity={0.2} />
      <Label x={at(29)} y={24} text="29" size={11} />
      <Label x={at(30.7)} y={24} text="30.7" size={11} />
      {rows.map((row) => (
        <g key={row.label}>
          <Label x={156} y={row.y + 6} text={row.label} anchor="end" size={13} />
          <rect x={at(29)} y={row.y - 14} width={at(row.days) - at(29)} height={22} rx={6} fill={row.color} opacity={0.9} />
        </g>
      ))}
    </Frame>
  );
}

export function AdhikSlip() {
  const { t } = useLocale();
  return (
    <Frame w={560} h={230} label={t("learn_gola.an_adhik_month_accumulating")}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={36 + i * 28} y={78} width={22} height={36 + i * 8} rx={4} fill={MARK} opacity={0.35 + i * 0.07} />
      ))}
      <path d="M268 70 C300 70 300 150 332 150" fill="none" stroke={INK} strokeWidth={1.5} opacity={0.4} />
      <rect x={348} y={56} width={168} height={78} rx={12} fill={GOOD} opacity={0.2} stroke={GOOD} strokeWidth={1.5} />
      <Label x={432} y={90} text={t("learn_gola.1_lunar_month")} fill={GOOD} />
      <Label x={432} y={114} text={t("learn_gola.adhik_month")} fill={GOOD} />
      <Label x={148} y={196} text={t("learn_gola.the_leftover_of_each_solar_month")} size={12} />
    </Frame>
  );
}

export function AvamaFill() {
  const { t } = useLocale();
  const gaps = [0.18, 0.4, 0.66, 1];
  return (
    <Frame w={560} h={230} label={t("learn_gola.an_avama_day_filling")}>
      <Label x={36} y={28} text={t("learn_gola.sunrise")} anchor="start" size={12} />
      <Label x={520} y={28} text={t("learn_gola.next_sunrise")} anchor="end" size={12} />
      {gaps.map((gap, i) => {
        const y = 52 + i * 42;
        const w = 460;
        const end = 48 + w;
        const cut = end - w * gap;
        return (
          <g key={i}>
            <rect x={48} y={y} width={w} height={22} rx={6} fill={INK} opacity={0.08} />
            <rect x={cut} y={y} width={end - cut} height={22} rx={6} fill={i === 3 ? RED : MARK} opacity={0.85} />
            <Label x={28} y={y + 16} text={String(i + 1)} anchor="end" size={12} />
          </g>
        );
      })}
      <Label x={400} y={214} text={t("learn_gola.a_full_remainder_1_avama")} fill={RED} size={12} />
    </Frame>
  );
}

export function AharganaSteps() {
  const { t } = useLocale();
  const steps = [
    { n: "65", t: t("learn_gola.solar"), c: TEAL },
    { n: "+ 0", t: t("learn_gola.adhik_dropped"), c: MARK },
    { n: "65", t: t("learn_gola.lunar"), c: TEAL },
    { n: "− 1", t: t("learn_gola.avama_dropped"), c: MARK },
    { n: "64", t: t("learn_gola.ahargana"), c: GOOD },
  ];
  return (
    <Frame w={560} h={250} label={t("learn_gola.five_steps_of_the_ahargana")}>
      {steps.map((step, i) => (
        <g key={step.t}>
          <rect x={28 + i * 106} y={70} width={96} height={92} rx={12} fill={step.c} opacity={0.16} stroke={step.c} strokeWidth={1.5} />
          <Label x={76 + i * 106} y={112} text={step.n} size={22} fill={step.c} />
          <Label x={76 + i * 106} y={186} text={step.t} size={10} />
          {i < steps.length - 1 ? <path d={`M${124 + i * 106} 116 h10`} stroke={INK} strokeWidth={1.5} opacity={0.4} /> : null}
        </g>
      ))}
    </Frame>
  );
}

export function MeridianShift() {
  const { t } = useLocale();
  const cx = 180;
  const cy = 128;
  const r = 78;
  const a = (-80 * Math.PI) / 180;
  return (
    <Frame w={560} h={250} label={t("learn_gola.sunrise_east_of_lanka")}>
      <circle cx={cx} cy={cy} r={r} fill={TEAL} opacity={0.12} stroke={INK} strokeWidth={1.5} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={TEAL} strokeWidth={2} />
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={MARK} strokeWidth={2} />
      <path d={`M ${cx} ${cy - 36} A 36 36 0 0 1 ${cx + Math.cos(a) * 36} ${cy + Math.sin(a) * 36}`} fill="none" stroke={MARK} strokeWidth={2} />
      <circle cx={430} cy={70} r={16} fill={SUN} />
      <Label x={430} y={108} text={t("learn_gola.sun")} fill={SUN} />
      <Label x={cx - 8} y={cy - r - 10} text={t("learn_gola.lanka")} anchor="end" fill={TEAL} size={12} />
      <Label x={300} y={168} text="10°" anchor="start" fill={MARK} size={16} />
      <Label x={430} y={168} text={t("learn_gola.correction_1_38")} fill={MARK} />
      <Label x={430} y={192} text={t("learn_gola.subtracted_in_the_east")} size={12} />
    </Frame>
  );
}

export function SineCircle() {
  const { t } = useLocale();
  const cx = 86;
  const cy = 214;
  const R = 160;
  const deg = 32;
  const a = (deg * Math.PI) / 180;
  const px = cx + R * Math.cos(a);
  const py = cy - R * Math.sin(a);
  const foot = cx + R * Math.cos(a);
  return (
    <Frame w={560} h={270} label={t("learn_gola.bhuja_sine_and_koti_sine")}>
      <path d={`M ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx} ${cy - R}`} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.45} />
      <line x1={cx} y1={cy} x2={cx + R + 16} y2={cy} stroke={INK} strokeWidth={1} opacity={0.3} />
      <line x1={cx} y1={cy} x2={cx} y2={cy - R - 12} stroke={INK} strokeWidth={1} opacity={0.3} />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={TEAL} strokeWidth={2} />
      <line x1={px} y1={py} x2={foot} y2={cy} stroke={MARK} strokeWidth={3} />
      <line x1={cx} y1={cy} x2={foot} y2={cy} stroke={GOOD} strokeWidth={3} />
      <line x1={cx + R} y1={cy} x2={foot} y2={cy} stroke={RED} strokeWidth={3} />
      <circle cx={px} cy={py} r={4} fill={INK} />
      <Label x={cx + 54} y={cy - 28} text="R 3438′" fill={TEAL} size={12} anchor="start" />
      <Label x={px + 8} y={(py + cy) / 2} text={t("learn_gola.bhuja_1719")} anchor="start" fill={MARK} size={12} />
      <Label x={(cx + foot) / 2} y={cy + 20} text={t("learn_gola.koti")} fill={GOOD} size={12} />
      <Label x={(cx + R + foot) / 2} y={cy + 20} text={t("learn_gola.versed")} fill={RED} size={12} />
      <Label x={px + 14} y={py - 8} text="30°" anchor="start" size={12} />
    </Frame>
  );
}

export function MandaFigure() {
  const { t } = useLocale();
  const ex = 250;
  const ey = 140;
  const ox = ex + 36;
  return (
    <Frame w={560} h={280} label={t("learn_gola.the_manda_correction")}>
      <line x1={70} y1={ey} x2={470} y2={ey} stroke={INK} strokeWidth={1} opacity={0.25} />
      <circle cx={ex} cy={ey} r={96} fill="none" stroke={INK} strokeWidth={1.25} strokeDasharray="5 5" opacity={0.55} />
      <circle cx={ox} cy={ey} r={96} fill="none" stroke={TEAL} strokeWidth={1.75} />
      <circle cx={ex} cy={ey} r={7} fill={SUN} />
      <circle cx={ox} cy={ey} r={3.5} fill={TEAL} />
      <line x1={ex} y1={ey} x2={ex + 92} y2={ey - 54} stroke={INK} strokeWidth={1.5} opacity={0.7} />
      <line x1={ex} y1={ey} x2={ex + 70} y2={ey - 78} stroke={MARK} strokeWidth={2} />
      <path d={`M ${ex + 48} ${ey - 28} A 56 56 0 0 0 ${ex + 40} ${ey - 46}`} fill="none" stroke={MARK} strokeWidth={2} />
      <Label x={ex} y={ey + 24} text={t("learn_gola.earth")} size={11} />
      <Label x={430} y={ey + 4} text={t("learn_gola.mandocca")} anchor="start" fill={TEAL} size={12} />
      <Label x={360} y={52} text={t("learn_gola.mean")} size={12} />
      <Label x={300} y={40} text={t("learn_gola.true")} fill={MARK} size={12} />
      <Label x={168} y={78} text={t("learn_gola.1_7")} fill={MARK} size={16} />
    </Frame>
  );
}

export function ShighraFigure() {
  const { t } = useLocale();
  const cx = 210;
  const cy = 140;
  const pr = 28;
  const px = cx + 92;
  const py = cy;
  return (
    <Frame w={560} h={270} label={t("learn_gola.the_shighra_circle_and_retrogression")}>
      <circle cx={cx} cy={cy} r={92} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.4} />
      <circle cx={cx} cy={cy} r={6} fill={SUN} />
      <circle cx={px} cy={py} r={pr} fill="none" stroke={TEAL} strokeWidth={2} />
      <circle cx={px} cy={py + pr - 2} r={6} fill={MARK} />
      <path d="M250 48 A 70 70 0 0 1 300 110" fill="none" stroke={GOOD} strokeWidth={2.5} />
      <polygon points="296,104 308,114 292,116" fill={GOOD} />
      <path d="M238 196 q-16 8 -8 20" fill="none" stroke={RED} strokeWidth={2.5} />
      <polygon points="228,214 236,226 220,220" fill={RED} />
      <Label x={cx} y={cy + 22} text={t("learn_gola.earth")} size={11} />
      <Label x={400} y={70} text={t("learn_gola.forward_mean")} anchor="start" fill={GOOD} size={12} />
      <Label x={400} y={188} text={t("learn_gola.backward_near_side")} anchor="start" fill={RED} size={12} />
      <Label x={400} y={214} text={t("learn_gola.backward_wins_retrograde_2")} anchor="start" fill={RED} size={12} />
    </Frame>
  );
}

export function EclipseCone() {
  const { t } = useLocale();
  return (
    <Frame w={560} h={270} label={t("learn_gola.the_lunar_shadow_and_solar_parallax")}>
      <circle cx={36} cy={78} r={14} fill={SUN} />
      <circle cx={150} cy={78} r={16} fill={TEAL} opacity={0.85} />
      <polygon points="166,70 300,58 300,98 166,86" fill={INK} opacity={0.18} />
      <circle cx={286} cy={78} r={10} fill={PALE} stroke={INK} strokeWidth={1} />
      <path d="M250 78 h28" stroke={MARK} strokeWidth={2} />
      <polygon points="274,74 286,78 274,82" fill={MARK} />
      <Label x={36} y={112} text={t("learn_gola.sun")} size={11} />
      <Label x={150} y={112} text={t("learn_gola.earth")} size={11} />
      <Label x={286} y={112} text={t("learn_gola.moon_east")} size={11} />
      <line x1={28} y1={140} x2={532} y2={140} stroke={INK} strokeWidth={1} opacity={0.15} />
      <circle cx={120} cy={200} r={28} fill={TEAL} opacity={0.2} stroke={INK} strokeWidth={1.25} />
      <circle cx={120} cy={200} r={3} fill={INK} />
      <circle cx={120} cy={176} r={3.5} fill={MARK} />
      <circle cx={250} cy={168} r={8} fill={PALE} stroke={INK} strokeWidth={1} />
      <circle cx={340} cy={150} r={12} fill={SUN} />
      <line x1={120} y1={200} x2={340} y2={150} stroke={INK} strokeWidth={1.25} opacity={0.7} />
      <line x1={120} y1={176} x2={340} y2={162} stroke={MARK} strokeWidth={1.75} />
      <Label x={430} y={176} text={t("learn_gola.from_the_centre_covered")} anchor="start" size={12} />
      <Label x={430} y={202} text={t("learn_gola.from_the_surface_parallax")} anchor="start" fill={MARK} size={12} />
    </Frame>
  );
}
