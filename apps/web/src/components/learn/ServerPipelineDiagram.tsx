import { cn } from "@/lib/utils";
import { tmCardPadLg, tmCardCap, tmDiagramSvg } from "@/lib/learn-classes";
import earthUrl from "@/assets/earth.svg?url";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { useTranslation } from "react-i18next";

/** Box labels, in the order they are laid out. `\n` splits a box onto two lines. */
const NODE = {
  loc: "learn.study.pipeline.node_observer",
  jd: "learn.study.pipeline.node_julian_day",
  ephe: "learn.study.pipeline.node_ephemeris",
  rs: "learn.study.pipeline.node_rise_set",
  lon: "learn.study.pipeline.node_longitudes",
  lag: "learn.study.pipeline.node_lagna",
  five: "learn.study.pipeline.node_five_angas",
  bnd: "learn.study.pipeline.node_end_times",
  uday: "learn.study.pipeline.node_panchanga_day",
  civ: "learn.study.pipeline.node_civil_timeline",
  at: "learn.study.pipeline.node_at_time",
  patro: "learn.study.pipeline.node_patro",
  fest: "learn.study.pipeline.node_festivals",
  sait: "learn.study.pipeline.node_sait",
  gochar: "learn.study.pipeline.node_gochar",
  ecl: "learn.study.pipeline.node_eclipses",
  kun: "learn.study.pipeline.node_kundali",
} as const;

function Box({
  x,
  y,
  w,
  h,
  label,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  accent?: "teal" | "amber" | "gold";
}) {
  const fill =
    accent === "amber"
      ? "color-mix(in srgb, var(--tm-amber) 14%, var(--tm-card))"
      : accent === "gold"
        ? "color-mix(in srgb, var(--tm-gold) 12%, var(--tm-card))"
        : "color-mix(in srgb, var(--tm-teal) 10%, var(--tm-card))";
  const stroke =
    accent === "amber"
      ? "var(--tm-amber)"
      : accent === "gold"
        ? "var(--tm-gold)"
        : "var(--tm-teal)";
  const lines = label.split("\n");
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
        opacity={0.95}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + h / 2 + (i - (lines.length - 1) / 2) * 13}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-[var(--tm-ink)] text-[11px] font-semibold"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Arrow({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--tm-ink-faint)"
      strokeWidth={1.4}
      markerEnd="url(#pipe-arrow)"
      opacity={0.85}
    />
  );
}

function GroupLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text
      x={x}
      y={y}
      className="fill-[var(--tm-amber)] text-[12px] font-bold uppercase tracking-wide"
    >
      {text}
    </text>
  );
}

export function ServerPipelineDiagram() {
  const { t } = useTranslation();
  const caption = t("learn.study.pipeline.caption");
  const n = Object.fromEntries(
    Object.entries(NODE).map(([id, key]) => [id, t(key)]),
  ) as Record<keyof typeof NODE, string>;

  return (
    <figure className={tmCardPadLg}>
      <svg
        viewBox="0 0 920 520"
        className={cn(tmDiagramSvg, "max-h-[min(520px,75vh)]")}
        role="img"
        aria-label={caption}
      >
        <defs>
          <marker
            id="pipe-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--tm-ink-faint)" />
          </marker>
        </defs>

        <image href={earthUrl} x="24" y="36" width="48" height="48" opacity={0.92} />
        <text x="80" y="58" className="fill-[var(--tm-ink-dim)] text-[11px]">
          {t("learn.study.pipeline.api_name")}
        </text>
        <text x="80" y="74" className="fill-[var(--tm-teal)] text-[11px] font-semibold">
          {t("learn.study.pipeline.api_transport")}
        </text>

        <GroupLabel x={32} y={118} text={t("learn.study.pipeline.group_foundation")} />
        <Box x={32} y={128} w={118} h={52} label={n.loc} />
        <Box x={168} y={128} w={118} h={52} label={n.jd} />
        <Box x={304} y={124} w={140} h={60} label={n.ephe} accent="teal" />

        <GroupLabel x={32} y={208} text={t("learn.study.pipeline.group_raw")} />
        <Box x={32} y={218} w={130} h={52} label={n.rs} />
        <Box x={180} y={218} w={150} h={52} label={n.lon} />
        <Box x={348} y={218} w={118} h={52} label={n.lag} />

        <GroupLabel x={32} y={298} text={t("learn.study.pipeline.group_angas")} />
        <Box x={32} y={308} w={160} h={56} label={n.five} accent="amber" />
        <Box x={210} y={308} w={130} h={56} label={n.bnd} />

        <GroupLabel x={32} y={388} text={t("learn.study.pipeline.group_daily")} />
        <Box x={32} y={398} w={150} h={56} label={n.uday} accent="teal" />
        <Box x={200} y={398} w={118} h={56} label={n.civ} />
        <Box x={336} y={398} w={100} h={56} label={n.at} />

        <GroupLabel x={520} y={118} text={t("learn.study.pipeline.group_apps")} />
        <Box x={520} y={128} w={120} h={44} label={n.patro} />
        <Box x={656} y={128} w={120} h={44} label={n.fest} />
        <Box x={792} y={128} w={108} h={44} label={n.sait} />
        <Box x={520} y={188} w={120} h={44} label={n.gochar} />
        <Box x={656} y={188} w={120} h={44} label={n.ecl} />
        <Box x={792} y={188} w={108} h={44} label={n.kun} />

        <g transform="translate(520, 268)">
          {(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const).map(
            (key, i) => (
              <image
                key={key}
                href={GRAHA_PLANET_ICON_URL[key]}
                x={(i % 4) * 52}
                y={Math.floor(i / 4) * 52}
                width={40}
                height={40}
                opacity={0.9}
              />
            ),
          )}
          <text x={0} y={118} className="fill-[var(--tm-ink-faint)] text-[10px]">
            {t("learn.study.pipeline.grahas_note")}
          </text>
        </g>

        <Arrow d="M150 154 H168" />
        <Arrow d="M286 154 H304" />
        <Arrow d="M374 184 V208" />
        <Arrow d="M97 180 V218" />
        <Arrow d="M330 270 V308" />
        <Arrow d="M192 334 H210" />
        <Arrow d="M112 364 V398" />
        <Arrow d="M374 426 H520" />
        <Arrow d="M182 426 H520" />
      </svg>
      <figcaption className={tmCardCap}>{caption}</figcaption>
    </figure>
  );
}
