/**
 * The shadbala card, shared by the website's and the app's
 * `components/kundali/ShadbalaCard.tsx`: the at-a-glance tiles (strongest,
 * weakest, average, how many meet the threshold), the selected planet and
 * chart scale, every row of the bala matrix (with the sthana and kala rows
 * that open into their components), the note and the graha-yuddha line.
 */
import { useState } from "react";
import type { BhavaBalaData, ShadbalaPlanet, ShadbalaResponse, ShadbalaStatus, YuddhaData } from "@vedic-patro/api-client";
import { fmt, type ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";
import {
  GRAHA_NAME_I18N,
  KALA_SUBS,
  STHANA_SUBS,
  grahaDisplayName,
  orderShadbalaPlanets,
  yuddhaVirupasForPlanet,
} from "@vedic-patro/domain/kundali/shadbala-display";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export const SHADBALA_STATUS_ORDER: ShadbalaStatus[] = ["Exceptional", "Strong", "Adequate", "Borderline", "Weak"];

const STATUS_LABEL: Record<ShadbalaStatus, string> = {
  Exceptional: "kundali.x.status_exceptional",
  Strong: "kundali.report.confidence_strong",
  Adequate: "kundali.x.status_adequate",
  Borderline: "kundali.x.status_borderline",
  Weak: "kundali.x.status_weak",
};

export type ShadbalaMatrixRow = {
  key: string;
  label: string;
  /** One value per planet, in `planets` order; "status" rows draw a badge per planet instead. */
  values: string[];
  statuses?: ShadbalaStatus[];
  bold?: boolean;
  sub?: boolean;
  expandable?: boolean;
  open?: boolean;
  toggle?: () => void;
};

export function useShadbalaCard({
  data,
  yuddha,
  bhavaBala,
}: {
  data: ShadbalaResponse;
  yuddha?: YuddhaData;
  bhavaBala?: BhavaBalaData | null;
}) {
  const { t, lang, digits } = useLocale();
  const { planets, summary } = data;
  const [openSthana, setOpenSthana] = useState(false);
  const [openKala, setOpenKala] = useState(false);
  const [scale, setScale] = useState<ShadbalaScale>("virupas");
  const ordered = orderShadbalaPlanets(planets);
  const [selectedKey, setSelectedKey] = useState(ordered[0]?.key ?? "sun");

  const statusLabel = (s: ShadbalaStatus) => t(STATUS_LABEL[s]);
  const grahaName = (key: string) => (GRAHA_NAME_I18N[key] ? t(GRAHA_NAME_I18N[key]!) : grahaDisplayName(key, lang));
  const rankByKey = new Map([...planets].sort((a, b) => b.ratio - a.ratio).map((p, i) => [p.key, i + 1]));
  const hasSubs = ordered.some((p) => p.sub_balas != null);
  const hasPhala = ordered.some((p) => p.ishta_phala != null);
  const required = (ratio: number) =>
    bilingualText(lang, t("ui.kundali.x_bab6a0ed", { v0: digits(ratio.toFixed(2)) }), `${ratio.toFixed(2)}x required`);

  const row = (key: string, label: string, value: (p: ShadbalaPlanet) => string, extra: Partial<ShadbalaMatrixRow> = {}): ShadbalaMatrixRow => ({
    key,
    label,
    values: ordered.map(value),
    ...extra,
  });

  const rows: ShadbalaMatrixRow[] = [
    row("rank", t("kundali.x.relative_rank"), (p) => digits(String(rankByKey.get(p.key) ?? "—")), { bold: true }),
    row("sthana", t("kundali.x.bala_sthana"), (p) => fmt(p.breakdown.sthana, digits), {
      expandable: hasSubs,
      open: openSthana,
      toggle: () => setOpenSthana((v) => !v),
    }),
    ...(openSthana ? STHANA_SUBS.map((s) => row(`sthana-${s.key}`, t(s.label), (p) => fmt(p.sub_balas?.sthana?.[s.key], digits), { sub: true })) : []),
    row("dig", t("kundali.disha"), (p) => fmt(p.breakdown.dig, digits)),
    row("kala", t("choghadiya.types.kala.name"), (p) => fmt(p.breakdown.kala, digits), {
      expandable: hasSubs,
      open: openKala,
      toggle: () => setOpenKala((v) => !v),
    }),
    ...(openKala
      ? KALA_SUBS.map((s) =>
          row(
            `kala-${s.key}`,
            t(s.label),
            (p) => (s.key === "yuddha" && yuddha ? fmt(yuddhaVirupasForPlanet(p, yuddha), digits) : fmt(p.sub_balas?.kala?.[s.key], digits)),
            { sub: true },
          ),
        )
      : []),
    row("cheshta", t("kundali.x.bala_chesta"), (p) => fmt(p.breakdown.cheshta, digits)),
    row("naisargika", t("kundali.x.bala_naisargika"), (p) => fmt(p.breakdown.naisargika, digits)),
    row("drik", t("kundali.drishti"), (p) => fmt(p.breakdown.drik, digits)),
    row("total", t("kundali.total_pinda"), (p) => fmt(p.total_virupas, digits), { bold: true }),
    row("rupas", t("kundali.rupas"), (p) => fmt(p.rupas, digits)),
    row("required", t("kundali.x.min_required"), (p) => fmt(p.required / 60, digits)),
    row("ratio", t("kundali.x.strength_ratio"), (p) => fmt(p.ratio, digits, 4), { bold: true }),
    ...(bhavaBala
      ? [
          row(
            "bhava",
            t("kundali.x.bhava_percent"),
            (p) => {
              const pct = bhavaBala.rulershipPercent[p.key];
              return pct != null ? `${digits(pct.toFixed(1))}%` : "—";
            },
            { bold: true },
          ),
        ]
      : []),
    ...(hasPhala
      ? [
          row("ishta", t("kundali.x.ishta_phala"), (p) => fmt(p.ishta_phala, digits)),
          row("kashta", t("kundali.x.kashta_phala"), (p) => fmt(p.kashta_phala, digits)),
        ]
      : []),
    { key: "status", label: t("kundali.status"), values: ordered.map((p) => statusLabel(p.status)), statuses: ordered.map((p) => p.status) },
  ];

  const wars = yuddha?.wars ?? [];
  return {
    planets: ordered,
    selectedKey,
    select: setSelectedKey,
    scale,
    setScale,
    grahaName,
    statusLabel,
    title: t("kundali.shadbala_planetary_strength_virupas"),
    method: bilingualText(lang, t("ui.kundali.x_4836cfed"), data.method),
    strongest: { label: t("kundali.strongest_planet"), key: summary.strongest.key, name: grahaName(summary.strongest.key), status: summary.strongest.status, sub: required(summary.strongest.ratio) },
    weakest: { label: t("kundali.weakest_planet"), key: summary.weakest.key, name: grahaName(summary.weakest.key), status: summary.weakest.status, sub: required(summary.weakest.ratio) },
    average: { label: t("kundali.average_rupas"), rupas: digits(summary.average_rupas.toFixed(2)), virupas: `${digits(summary.average_virupas.toFixed(2))} ${t("kundali.virupas")}` },
    threshold: {
      label: t("kundali.planets_meeting_threshold"),
      count: digits(summary.meeting_threshold),
      of: ` / ${digits(summary.total_planets)}`,
      sub: t("kundali.adequate_or_stronger"),
      chips: SHADBALA_STATUS_ORDER.map((s) => ({ status: s, label: `${statusLabel(s)} ${digits(summary.counts[s])}`, active: summary.counts[s] > 0 })),
    },
    tableTitle: t("kundali.shadbala_table"),
    balaHeader: t("kundali.bala"),
    rows,
    note: [t("kundali.virupas_per_bala_expand_sthana_and_kala_for_component_s"), bhavaBala ? t("kundali.bhava_in_is_the_mean_house_strength_of_bhavas_ruled_by_") : ""]
      .filter(Boolean)
      .join(" "),
    yuddhaLine:
      wars.length > 0
        ? `${t("kundali.graha_yuddha_detected")} ${wars
            .map((w) =>
              bilingualText(
                lang,
                t("ui.kundali.x_b48812f0", { v0: grahaName(w.winner), v1: grahaName(w.loser), v2: fmt(w.yuddhaVirupas, digits), v3: digits(w.separationDeg.toFixed(2)) }),
                `${grahaName(w.winner)} defeats ${grahaName(w.loser)} (${fmt(w.yuddhaVirupas, digits)} virupas, ${w.separationDeg.toFixed(2)}° apart)`,
              ),
            )
            .join("; ")}.`
        : null,
  };
}
