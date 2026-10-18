/**
 * The avakahada wheel, shared by the website's and the app's
 * `components/avakahada/AvakahadaWheel.tsx`: the 27 rows in the reader's
 * language, the search filter, the selected (and hovered) segment, zoom and
 * pan, the attribute rings' labels, what the hub shows for the focus, and
 * copy. Each app draws the SVG and handles its own gestures.
 */
import { useState } from "react";
import { AVAKAHADA } from "@vedic-patro/domain/jyotish/avakahada-data";
import { localizeGana, localizeRashi } from "@vedic-patro/domain/jyotish/avakahada-locale";
import { ATTR_RINGS, attrValue, toWheelRow, type AttrRingId, type AvakahadaWheelRow } from "@vedic-patro/domain/jyotish/avakahada-wheel";
import { useLocale } from "@vedic-patro/i18n/react";

export type AvakahadaHubRing = AttrRingId | "nakshatra" | "pada";
export type AvakahadaHubFocus = { index: number; ring: AvakahadaHubRing; padaIndex?: number };

export const AVAKAHADA_ZOOM = { min: 0.6, max: 3.5, step: 1.35 } as const;

function ringLabelKey(ring: AvakahadaHubRing): string {
  if (ring === "nakshatra") return "avakahada.col_nakshatra";
  if (ring === "pada") return "avakahada.col_akshara";
  return `avakahada.col_${ring}`;
}

export function sameAvakahadaFocus(a: AvakahadaHubFocus | null | undefined, b: AvakahadaHubFocus): boolean {
  return a?.index === b.index && a?.ring === b.ring && a?.padaIndex === b.padaIndex;
}

export function useAvakahadaWheel({ highlighted }: { highlighted?: Pick<AvakahadaWheelRow, "index">[] }) {
  const { t, lang, digits } = useLocale();
  const [selected, setSelected] = useState<AvakahadaHubFocus | null>(null);
  const [hovered, setHovered] = useState<AvakahadaHubFocus | null>(null);
  const [zoom, setZoomRaw] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const setZoom = (z: number) => {
    const next = Math.max(AVAKAHADA_ZOOM.min, Math.min(AVAKAHADA_ZOOM.max, z));
    setZoomRaw(next);
    if (next <= 1) setPan({ x: 0, y: 0 });
  };
  const resetView = () => {
    setZoomRaw(1);
    setPan({ x: 0, y: 0 });
  };

  const allRows = AVAKAHADA.map((r) => toWheelRow(r, lang));
  const highlightSet = new Set((highlighted ?? allRows).map((r) => r.index));
  const hasFilter = highlighted !== undefined && highlighted.length < allRows.length;
  const activeFocus = selected ?? hovered;
  const activeRow = activeFocus != null ? allRows.find((r) => r.index === activeFocus.index) : undefined;

  const selectFocus = (focus: AvakahadaHubFocus) => setSelected((s) => (sameAvakahadaFocus(s, focus) ? null : focus));

  /** What the hub shows for a focus on a row. */
  const hub = (focus: AvakahadaHubFocus, row: AvakahadaWheelRow) => {
    const { ring, padaIndex } = focus;
    const value =
      ring === "nakshatra" ? row.nakshatraLabel : ring === "pada" ? (padaIndex != null ? (row.aksharas[padaIndex] ?? "") : "") : attrValue(ring, row, lang);
    return {
      ring,
      label: t(ringLabelKey(ring)),
      value,
      nakTitle: `${row.index}. ${row.nakshatraLabel}`,
      attrs: ATTR_RINGS.map((attr) => ({ id: attr.id, label: t(`avakahada.col_${attr.id}`), value: attrValue(attr.id, row, lang) })),
      vairi: t("avakahada.wheel_vairi", { yoni: row.vairiYoni }),
      charan:
        ring === "pada" && padaIndex != null
          ? t("avakahada.charan_title", { n: String(padaIndex + 1), rashi: localizeRashi(row.charanRashis[padaIndex]!, lang) })
          : null,
    };
  };

  return {
    allRows,
    highlightSet,
    hasFilter,
    selected,
    hovered,
    setHovered,
    selectFocus,
    activeFocus,
    activeRow,
    hub,
    zoom,
    setZoom,
    zoomIn: () => setZoom(zoom * AVAKAHADA_ZOOM.step),
    zoomOut: () => setZoom(zoom / AVAKAHADA_ZOOM.step),
    canZoomIn: zoom < AVAKAHADA_ZOOM.max,
    canZoomOut: zoom > AVAKAHADA_ZOOM.min,
    zoomLabel: `${digits(Math.round(zoom * 100))}%`,
    pan,
    setPan,
    resetView,
    /** The gana legend, in wheel order. */
    ganas: [...new Set(AVAKAHADA.map((r) => r.gana))].map((gana) => ({ gana, label: localizeGana(gana, lang) })),
    attrRings: ATTR_RINGS.map((ring) => ({ ...ring, label: t(`avakahada.col_${ring.id}`) })),
    copy: {
      aria: t("avakahada.wheel_aria"),
      title: t("avakahada.wheel_title"),
      subtitle: t("avakahada.wheel_subtitle"),
      svgAria: t("avakahada.wheel_svg_aria"),
      zoomIn: t("avakahada.wheel_zoom_in"),
      zoomOut: t("avakahada.wheel_zoom_out"),
      zoomReset: t("avakahada.wheel_zoom_reset"),
      hubTitle: t("avakahada.wheel_hub_title"),
      hubHint: t("avakahada.wheel_hub_hint"),
      legendGana: t("avakahada.wheel_legend_gana"),
      legendRings: t("avakahada.wheel_legend_rings"),
      panHint: t("avakahada.wheel_pan_hint"),
      filter: hasFilter ? t("avakahada.wheel_legend_filter", { count: digits(highlightSet.size) }) : null,
    },
  };
}
