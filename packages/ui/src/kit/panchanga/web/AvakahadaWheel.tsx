import { useMemo, useRef, useState } from "react";
import { AVAKAHADA, type Gana } from "@vedic-patro/domain/avakahada-data";
import { findNakshatraIcon } from "@vedic-patro/domain/nakshatra-icons";
import { Icon } from "@vedic-patro/ui";
import { zoomInIcon, zoomOutIcon } from "../icons";
import { GANA_PILL_CLASS, GANA_SWATCH_CLASS } from "@vedic-patro/design-tokens/classes/patro-classes";
import {
  avWheelAttrVal,
  avWheelGuideCircle,
  avWheelHit,
  avWheelHubRing,
  avWheelNakIdx,
  avWheelNakName,
  avWheelPadaAkshar,
  avWheelRingGuide,
  avWheelRim,
  avWheelSegAttr,
  avWheelSegNak,
  avWheelSegPada,
  avWheelSpoke,
  avWheelTheme,
} from "@vedic-patro/design-tokens/classes/av-wheel-classes";
import { wheelIconBtn } from "@vedic-patro/design-tokens/classes/wheel-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { avakahadaClasses } from "@vedic-patro/design-tokens/classes/avakahada-classes";
import { CX, CY, R, type AvakahadaWheelRow, toWheelRow, polar, sectorPath, attrValue } from "@vedic-patro/domain/avakahada-wheel";
import { AVAKAHADA_ZOOM, sameAvakahadaFocus, useAvakahadaWheel, type AvakahadaHubFocus } from "@vedic-patro/features/avakahada";
import { useLocale } from "@vedic-patro/i18n/react";
import { midnight, wheel } from "@vedic-patro/design-tokens";
export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/domain/avakahada-wheel";
const HUB_ICON_SVG = "inline-block h-full w-full [&>svg]:h-full [&>svg]:w-full [&_path]:fill-current";
const WHEEL_SVG = "block h-auto w-full max-w-[660px] select-none";
const HUB_FRAME = "flex h-full w-full items-center justify-center overflow-hidden text-center";
const WHEEL_PAN_AREA = "flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden";
const RIM = 302;

const NAK_STEP = 360 / 27;
/** Ring-name guides sit on a nakshatra boundary spoke — not at 286° (Śravaṇa mid). */
const RING_GUIDE_DEG = 17 * NAK_STEP;

type HubFocus = AvakahadaHubFocus;

function RadialText({
  deg,
  r,
  className,
  children,
  size,
}: {
  deg: number;
  r: number;
  className?: string;
  children: React.ReactNode;
  size?: number;
}) {
  const [x, y] = polar(r, deg);
  const flip = deg > 90 && deg < 270;
  const rot = flip ? deg + 180 : deg;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className={className}
      style={{ ...(size ? { fontSize: size } : {}), pointerEvents: "none" }}
      transform={`rotate(${rot} ${x.toFixed(2)} ${y.toFixed(2)})`}
    >
      {children}
    </text>
  );
}

function HubContent({ hub, row }: { hub: ReturnType<ReturnType<typeof useAvakahadaWheel>["hub"]>; row: AvakahadaWheelRow }) {
  const { ring, label, value } = hub;
  const icon = findNakshatraIcon(row.en);

  if (ring === "nakshatra") {
    return (
      <div className={cn(avakahadaClasses.hubStack, "flex max-h-full flex-col overflow-y-auto")}>
        <div className={cn(avakahadaClasses.hubIcon, `text-[var(--w-ink,${midnight.foam})]`)}>
          {icon?.svg ? (
            <span
              className={HUB_ICON_SVG}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: icon.svg }}
            />
          ) : (
            <span className={avakahadaClasses.hubIconFallback}>{row.index}</span>
          )}
        </div>
        <p className={cn(avakahadaClasses.hubNakTitle, `text-[var(--w-ink,${midnight.foam})]`)}>
          {row.index}. {row.nakshatraLabel}
        </p>
        <dl className={avakahadaClasses.hubAttrList}>
          {hub.attrs.map((attr) => (
            <div
              key={attr.id}
              className={cn(
                avakahadaClasses.hubAttrRow,
                "grid grid-cols-[52px_1fr] border-[color-mix(in_srgb,var(--w-sep-soft)_80%,transparent)] max-sm:grid-cols-[44px_1fr]",
              )}
            >
              <dt className={cn(avakahadaClasses.hubAttrName, `text-[var(--w-ink-faint,${wheel.inkFaint})]`)}>{attr.label}</dt>
              <dd className={cn(avakahadaClasses.hubAttrValue, `text-[var(--w-ink,${midnight.foam})]`)}>{attr.value}</dd>
            </div>
          ))}
        </dl>
        <p className={avakahadaClasses.hubVairi}>
          {hub.vairi}
        </p>
      </div>
    );
  }

  if (ring === "pada" && hub.charan) {
    return (
      <div className={cn(avakahadaClasses.hubStack, "flex max-h-full flex-col overflow-y-auto")}>
        <p className={cn(avakahadaClasses.hubLabel, "text-[var(--w-accent,var(--color-danger))]")}>
          {label}
        </p>
        <p className={cn(avakahadaClasses.hubValue, `text-[var(--w-ink,${midnight.foam})]`)}>{value}</p>
        <p className={cn(avakahadaClasses.hubSub, `text-[var(--w-ink-faint,${wheel.inkFaint})]`)}>
          {hub.charan}
        </p>
        <p className={cn(avakahadaClasses.hubSub, `text-[var(--w-ink-faint,${wheel.inkFaint})]`)}>
          {row.index}. {row.nakshatraLabel}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(avakahadaClasses.hubStack, "flex max-h-full flex-col overflow-y-auto")}>
      <p className={cn(avakahadaClasses.hubLabel, "text-[var(--w-accent,var(--color-danger))]")}>
        {label}
      </p>
      {ring === "gana" ? (
        <span className={cn(avakahadaClasses.hubGanaPill, "inline-block", GANA_PILL_CLASS[row.gana])}>
          {value}
        </span>
      ) : (
        <p className={cn(avakahadaClasses.hubValue, `text-[var(--w-ink,${midnight.foam})]`)}>{value}</p>
      )}
      <p className={cn(avakahadaClasses.hubSub, `text-[var(--w-ink-faint,${wheel.inkFaint})]`)}>
        {row.index}. {row.nakshatraLabel}
      </p>
      {ring === "yoni" ? (
        <p className={avakahadaClasses.hubVairi}>
          {hub.vairi}
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  highlighted?: Pick<AvakahadaWheelRow, "index">[];
  /** Gana sector fills. Kept in the app so this file stays free of Devanagari keys. */
  ganaFill: Record<Gana, string>;
};

const ZOOM_MIN = AVAKAHADA_ZOOM.min;

export function AvakahadaWheel({ highlighted, ganaFill }: Props) {
  const v = useAvakahadaWheel({ highlighted });
  const { lang } = useLocale();
  const { zoom, pan, setPan, allRows, highlightSet, hasFilter, activeFocus, activeRow, selectFocus, attrRings, copy } = v;
  const setHover = v.setHovered;
  const resetView = v.resetView;
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) v.zoomIn();
    else v.zoomOut();
  };

  const nakLayers = useMemo(() => {
    const segs: React.ReactNode[] = [];
    const hits: React.ReactNode[] = [];
    const labels: React.ReactNode[] = [];

    allRows.forEach((row, i) => {
      const a0 = i * NAK_STEP;
      const a1 = (i + 1) * NAK_STEP;
      const mid = (a0 + a1) / 2;
      const isActiveNak = activeFocus?.index === row.index;
      const isDim = hasFilter && !highlightSet.has(row.index);

      segs.push(
        <path
          key={`nak-${row.index}`}
          d={sectorPath(R.nakIn, R.nakOut, a0, a1)}
          className={avWheelSegNak({
            alt: i % 2 === 1,
            sel: isActiveNak && activeFocus?.ring === "nakshatra",
            dim: isDim,
          })}
          style={{ fill: ganaFill[row.gana] }}
        />,
      );

      hits.push(
        <path
          key={`hit-nak-${row.index}`}
          d={sectorPath(R.nakIn, R.nakOut, a0, a1)}
          className={avWheelHit}
          onMouseEnter={() => setHover({ index: row.index, ring: "nakshatra" })}
          onMouseLeave={() => setHover(null)}
          onClick={() => selectFocus({ index: row.index, ring: "nakshatra" })}
        />,
      );

      attrRings.forEach((ring) => {
        const val = attrValue(ring.id, row, lang);
        const ringFocus: HubFocus = { index: row.index, ring: ring.id };
        const isRingSel = sameAvakahadaFocus(activeFocus, ringFocus);

        segs.push(
          <path
            key={`${ring.id}-${row.index}`}
            d={sectorPath(ring.rIn, ring.rOut, a0, a1)}
            className={avWheelSegAttr(ring.id, {
              alt: i % 2 === 1,
              sel: isActiveNak,
              ringSel: isRingSel,
              dim: isDim,
            })}
          />,
        );
        hits.push(
          <path
            key={`hit-${ring.id}-${row.index}`}
            d={sectorPath(ring.rIn, ring.rOut, a0, a1)}
            className={avWheelHit}
            onMouseEnter={() => setHover(ringFocus)}
            onMouseLeave={() => setHover(null)}
            onClick={() => selectFocus(ringFocus)}
          />,
        );
        labels.push(
          <RadialText
            key={`${ring.id}-lbl-${row.index}`}
            deg={mid}
            r={(ring.rOut + ring.rIn) / 2}
            className={avWheelAttrVal(ring.id, { sel: isRingSel })}
            size={ring.id === "rashi" || ring.id === "yoni" ? 7 : 6.5}
          >
            {val}
          </RadialText>,
        );
      });

      const nakName =
        row.nakshatraLabel.length > 8 ? `${row.nakshatraLabel.slice(0, 7)}…` : row.nakshatraLabel;

      labels.push(
        <RadialText key={`nak-idx-${row.index}`} deg={mid} r={278} className={avWheelNakIdx(isActiveNak)} size={8}>
          {row.index}
        </RadialText>,
        <RadialText key={`nak-name-${row.index}`} deg={mid} r={264} className={avWheelNakName(isActiveNak)} size={9}>
          {nakName}
        </RadialText>,
      );
    });

    return { segs, hits, labels };
  }, [activeFocus, allRows, attrRings, hasFilter, highlightSet, lang, selectFocus, setHover]);

  const padaSegs = useMemo(() => {
    const step = 360 / 108;
    return AVAKAHADA.flatMap((row, ni) =>
      row.aksharas.map((akshara, pi) => {
        const i = ni * 4 + pi;
        const a0 = i * step;
        const a1 = (i + 1) * step;
        const mid = (a0 + a1) / 2;
        const isDim = hasFilter && !highlightSet.has(row.index);
        const padaFocus: HubFocus = { index: row.index, ring: "pada", padaIndex: pi };
        const isPadaSel = sameAvakahadaFocus(activeFocus, padaFocus);

        return (
          <g key={`pada-${i}`}>
            <path
              d={sectorPath(R.padaIn, R.padaOut, a0, a1)}
              className={avWheelSegPada({
                alt: i % 2 === 1,
                dim: isDim,
                ringSel: isPadaSel,
              })}
              onMouseEnter={() => setHover(padaFocus)}
              onMouseLeave={() => setHover(null)}
              onClick={() => selectFocus(padaFocus)}
            />
            <RadialText deg={mid} r={239} className={avWheelPadaAkshar} size={7.5}>
              {akshara}
            </RadialText>
          </g>
        );
      }),
    );
  }, [activeFocus, hasFilter, highlightSet, selectFocus, setHover]);

  const ringGuides = useMemo(
    () =>
      attrRings.map((ring) => (
        <RadialText
          key={`guide-${ring.id}`}
          deg={RING_GUIDE_DEG}
          r={(ring.rOut + ring.rIn) / 2}
          className={avWheelRingGuide}
          size={6}
        >
          {ring.label}
        </RadialText>
      )),
    [attrRings],
  );

  const guideCircles = useMemo(
    () =>
      [R.padaIn, R.rashiIn, R.lordIn, R.varnaIn, R.vashyaIn, R.yoniIn, R.ganaIn, R.nadiIn].map((r) => (
        <circle key={`guide-c-${r}`} cx={CX} cy={CY} r={r} className={avWheelGuideCircle} />
      )),
    [],
  );


  return (
    <section className={cn(avWheelTheme, "pn-wheel", avakahadaClasses.wheelSection)} aria-label={copy.aria}>
      <div className={avakahadaClasses.wheelHead}>
        <h2 className={avakahadaClasses.wheelTitle}>{copy.title}</h2>
        <p className={avakahadaClasses.wheelSubtitle}>{copy.subtitle}</p>
      </div>

      <div className={cn(
          avakahadaClasses.wheelStage,
          `relative flex min-h-[min(92vw,680px)] flex-col border border-[var(--w-surface-border)] bg-[radial-gradient(ellipse_at_50%_42%,var(--w-sky-0,${wheel.sky0})_0%,var(--w-sky-2,${wheel.sky2})_72%)] max-sm:min-h-[min(95vw,420px)]`,
        )}>
        <div className={cn(avakahadaClasses.wheelToolbar, "flex")}>
          <button
            type="button"
            className={wheelIconBtn}
            title={copy.zoomIn}
            aria-label={copy.zoomIn}
            onClick={v.zoomIn}
          >
            <Icon node={zoomInIcon} size={16} tone="muted" />
          </button>
          <button
            type="button"
            className={wheelIconBtn}
            title={copy.zoomOut}
            aria-label={copy.zoomOut}
            onClick={v.zoomOut}
            disabled={zoom <= ZOOM_MIN}
          >
            <Icon node={zoomOutIcon} size={16} tone="muted" />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              className={cn(wheelIconBtn, "px-1.5 text-sm")}
              title={copy.zoomReset}
              onClick={resetView}
            >
              1:1
            </button>
          )}
          <span className={cn(avakahadaClasses.zoomPercent, `min-w-[42px] text-[var(--w-ink-dim,${wheel.inkDim})]`)}>
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div
          className={cn(
            WHEEL_PAN_AREA,
            zoom > 1 && "cursor-grab",
            isDragging && "cursor-grabbing",
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="flex w-full justify-center will-change-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.12s ease-out",
            }}
          >
        <svg viewBox="0 0 620 620" className={WHEEL_SVG} role="img" aria-label={copy.svgAria}>
          <defs>
            <radialGradient id="av-hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--av-hub-center)" />
              <stop offset="100%" stopColor="var(--av-hub-edge)" />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={RIM} className={avWheelRim} />
          {guideCircles}

          {padaSegs}
          {nakLayers.segs}
          {ringGuides}
          {nakLayers.labels}

          {Array.from({ length: 27 }, (_, i) => {
            const deg = i * NAK_STEP;
            const [x1, y1] = polar(R.nadiIn, deg);
            const [x2, y2] = polar(R.nakOut, deg);
            return <line key={`spoke-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className={avWheelSpoke} />;
          })}

          {nakLayers.hits}

          <circle cx={CX} cy={CY} r={R.hub} fill="url(#av-hub-glow)" className={avWheelHubRing} />

          <foreignObject x={CX - R.hub + 10} y={CY - R.hub + 10} width={R.hub * 2 - 20} height={R.hub * 2 - 20}>
            <div className={HUB_FRAME}>
              {activeRow && activeFocus ? (
                <HubContent hub={v.hub(activeFocus, activeRow)} row={activeRow} />
              ) : (
                <div>
                  <p className={cn(avakahadaClasses.hubIdleTitle, "text-[var(--w-accent,var(--color-danger))]")}>
                    {copy.hubTitle}
                  </p>
                  <p className={cn(avakahadaClasses.hubIdleHint, `text-[var(--w-ink,${midnight.foam})]`)}>
                    {copy.hubHint}
                  </p>
                </div>
              )}
            </div>
          </foreignObject>
        </svg>
          </div>
        </div>
      </div>

      <div className={cn(avakahadaClasses.legend, "flex")}>
        <span className={avakahadaClasses.legendLabel}>{copy.legendGana}</span>
        {v.ganas.map(({ gana, label }) => (
          <span key={gana} className={cn(avakahadaClasses.legendItem, "inline-flex")}>
            <span
              className={cn(avakahadaClasses.legendSwatch, GANA_SWATCH_CLASS[gana])}
              aria-hidden
            />
            {label}
          </span>
        ))}
        <span>{copy.legendRings}</span>
        <span>· {copy.panHint}</span>
        {hasFilter && (
          <span>
            {copy.filter}
          </span>
        )}
      </div>
    </section>
  );
}

export const AVAKAHADA_WHEEL_ROWS = AVAKAHADA.map((r) => toWheelRow(r, "ne"));
