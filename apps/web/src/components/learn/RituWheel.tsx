/**
 * The six ऋतु as a ring, against the twelve वि.सं. months and the four
 * सायन markers.
 *
 * The छ ऋतु section had a table and nothing else, and a table cannot show the
 * one thing that matters about ऋतु: they are named by महिना but *defined* by
 * where the Sun stands in its north–south swing. Two rulers, one wheel —
 *
 *   • outer ring — the twelve महिना (निरयन: राशि boundaries, सङ्क्रान्ति)
 *   • inner ring — the six ऋतु, two महिना each
 *   • the four spokes — विषुव and अयनान्त (सायन: declination)
 *
 * The spokes deliberately do not land on the ऋतु boundaries. That offset is
 * the whole point: ग्रीष्म अयनान्त falls inside असार, not at the जेठ–असार
 * seam, because one ruler is tied to the stars and the other to the seasons.
 * Since अयन चलन moves the सायन ruler by ~१° every ७२ years, the spokes creep
 * anticlockwise through the ring — which is what "ऋतु drift" means, and why
 * a ऋतु argument has to be made in उत्तरायण/दक्षिणायन rather than in महिना.
 */

import { wheelFigure, wheelFitScreen } from "@vedic-patro/design-tokens/classes/wheel-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useTranslation } from "@vedic-patro/i18n/react";

import { useLocale } from "@/i18n/locale";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/calendar/bs-calendar";

import { illustration } from "@vedic-patro/design-tokens";
/* The viewBox is wider than the wheel on purpose: the four marker labels sit
   outside the month ring, and at a square viewBox the two side ones ran off
   the edge and were clipped mid-word. */
const VB_W = 500;
const VB_H = 350;
const CX = VB_W / 2;
const CY = VB_H / 2;
const R_MONTH_OUT = 150;
const R_MONTH_IN = 120;
const R_RITU_OUT = 116;
const R_RITU_IN = 74;

const EQUINOX = illustration.green51;
const SOLSTICE = illustration.orange50;

/** Ayanamsha, degrees — how far the सायन markers sit from बैशाख १. */
const AYANAMSHA = 24;

interface Ritu {
  /** Catalogue key for the ऋतु name — resolved at render, not at module load. */
  key: string;
  colour: string;
}

/** Six ऋतु, starting at बैशाख — वसन्त straddles चैत–बैशाख, so it opens here. */
const RITUS: Ritu[] = [
  { key: "learn.study.ritu.vasanta", colour: illustration.green55 },
  { key: "learn.study.ritu.grishma", colour: illustration.orange53b },
  { key: "learn.study.ritu.varsha", colour: illustration.sky54 },
  { key: "learn.study.ritu.sharad", colour: illustration.amber45 },
  { key: "learn.study.ritu.hemanta", colour: illustration.sky65 },
  { key: "learn.study.ritu.shishira", colour: illustration.sky74 },
];

const MARKERS = [
  { lambda: 90, kind: "solstice", key: "learn.study.summer_solstice" },
  { lambda: 180, kind: "equinox", key: "learn.study.autumn_equinox" },
  { lambda: 270, kind: "solstice", key: "learn.study.winter_solstice" },
  { lambda: 0, kind: "equinox", key: "learn.study.spring_equinox" },
] as const;

const D2R = Math.PI / 180;
/** बैशाख १ at the top, the year running clockwise. */
const at = (deg: number, r: number): [number, number] => {
  const a = (deg - 90) * D2R;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

function arc(from: number, to: number, rOut: number, rIn: number) {
  const [x1, y1] = at(from, rOut);
  const [x2, y2] = at(to, rOut);
  const [x3, y3] = at(to, rIn);
  const [x4, y4] = at(from, rIn);
  const big = to - from > 180 ? 1 : 0;
  return `M${x1} ${y1} A${rOut} ${rOut} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${rIn} ${rIn} 0 ${big} 0 ${x4} ${y4} Z`;
}

export function RituWheel() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const monthNames = ne ? BS_MONTHS_NE : ([...BS_MONTH_NAMES] as string[]);

  return (
    <figure className={wheelFigure}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className={cn("block w-full max-w-[500px]", wheelFitScreen)}
        role="img"
        aria-label={t("learn.study.ritu.aria")}
      >
        {/* ऋतु band — two महिना each */}
        {RITUS.map((r, i) => (
          <g key={r.key}>
            <path d={arc(i * 60, (i + 1) * 60, R_RITU_OUT, R_RITU_IN)} fill={r.colour} opacity={0.3} />
            <path
              d={arc(i * 60, (i + 1) * 60, R_RITU_OUT, R_RITU_IN)}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.14}
              strokeWidth={0.7}
            />
            <text
              x={at(i * 60 + 30, (R_RITU_OUT + R_RITU_IN) / 2)[0]}
              y={at(i * 60 + 30, (R_RITU_OUT + R_RITU_IN) / 2)[1] + 3.5}
              textAnchor="middle"
              className="fill-current text-diagram-xs font-semibold opacity-85"
            >
              {t(r.key)}
            </text>
          </g>
        ))}

        {/* महिना band — the निरयन ruler */}
        {monthNames.map((m, i) => (
          <g key={i}>
            <path
              d={arc(i * 30, (i + 1) * 30, R_MONTH_OUT, R_MONTH_IN)}
              fill="currentColor"
              opacity={i % 2 ? 0.05 : 0.09}
            />
            <line
              x1={at(i * 30, R_MONTH_IN)[0]}
              y1={at(i * 30, R_MONTH_IN)[1]}
              x2={at(i * 30, R_MONTH_OUT)[0]}
              y2={at(i * 30, R_MONTH_OUT)[1]}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={0.7}
            />
            <text
              x={at(i * 30 + 15, (R_MONTH_OUT + R_MONTH_IN) / 2)[0]}
              y={at(i * 30 + 15, (R_MONTH_OUT + R_MONTH_IN) / 2)[1] + 3}
              textAnchor="middle"
              className="fill-current text-diagram-2xs opacity-70"
            >
              {m}
            </text>
          </g>
        ))}

        {/* the four सायन markers — spokes that land mid-month, not on a seam */}
        {MARKERS.map((k) => {
          const deg = (k.lambda - AYANAMSHA + 360) % 360;
          const colour = k.kind === "equinox" ? EQUINOX : SOLSTICE;
          const [x1, y1] = at(deg, R_RITU_IN - 8);
          const [x2, y2] = at(deg, R_MONTH_OUT + 4);
          const [lx, ly] = at(deg, R_MONTH_OUT + 15);
          const right = Math.cos((deg - 90) * D2R) > 0.15;
          const flat = Math.abs(Math.cos((deg - 90) * D2R)) <= 0.15;
          return (
            <g key={k.key}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colour} strokeWidth={1.4} opacity={0.9} />
              <circle cx={x2} cy={y2} r={3.2} fill={colour} />
              <text
                x={lx}
                y={ly + 3}
                textAnchor={flat ? "middle" : right ? "start" : "end"}
                className="text-diagram-2xs font-semibold"
                style={{ fill: colour }}
              >
                {t(k.key)}
              </text>
            </g>
          );
        })}

        <text
          x={CX}
          y={CY - 5}
          textAnchor="middle"
          className="fill-current text-diagram-xs font-semibold opacity-75"
        >
          {t("learn.study.ritu.six_ritus")}
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" className="fill-current text-diagram-2xs opacity-50">
          {t("learn.study.ritu.two_months_each")}
        </text>
      </svg>
      <figcaption className="mt-2 text-xs leading-snug text-white/45">
        {t("learn.study.ritu.caption")}
      </figcaption>
    </figure>
  );
}

export default RituWheel;
