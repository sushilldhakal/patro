import { Fragment, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { ChevronRight } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type {
  BhavaBalaData,
  ShadbalaPlanet,
  ShadbalaResponse,
  ShadbalaStatus,
  YuddhaData,
} from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { ShadbalaChart, type ShadbalaScale } from "@/components/kundali/ShadbalaChart";
import {
  GRAHA_NAME_I18N,
  KALA_SUBS,
  STHANA_SUBS,
  grahaDisplayName,
  orderShadbalaPlanets,
  yuddhaVirupasForPlanet,
} from "@vedic-patro/domain/kundali/shadbala-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { fmt } from "@vedic-patro/domain/kundali/shadbala-chart";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

const STATUS_ORDER: ShadbalaStatus[] = [
  "Exceptional",
  "Strong",
  "Adequate",
  "Borderline",
  "Weak",
];

const STATUS_STYLES: Record<ShadbalaStatus, string> = {
  Exceptional: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Strong: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  Adequate: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Borderline: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  Weak: "bg-destructive/15 text-destructive border-destructive/30",
};

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-1.5 text-sm";
const num = "text-right font-mono tabular-nums";

const STATUS_LABEL: Record<ShadbalaStatus, string> = {
  Exceptional: "kundali.x.status_exceptional",
  Strong: "kundali.report.confidence_strong",
  Adequate: "kundali.x.status_adequate",
  Borderline: "kundali.x.status_borderline",
  Weak: "kundali.x.status_weak",
};

function StatusBadge({ status }: { status: ShadbalaStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex",
        kundaliDetailClasses.parts.statusBadge,
        STATUS_STYLES[status]
      )}
    >
      {t(STATUS_LABEL[status])}
    </span>
  );
}

function GlanceTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={kundaliDetailClasses.glance.card}>
      <p className={kundaliDetailClasses.glance.label}>
        {label}
      </p>
      {children}
    </div>
  );
}

type MatrixRowProps = {
  label: string;
  planets: ShadbalaPlanet[];
  value: (p: ShadbalaPlanet) => string | React.ReactNode;
  bold?: boolean;
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
  sub?: boolean;
  selectedKey?: string;
};

function MatrixRow({ label, planets, value, bold, expandable, open, onToggle, sub, selectedKey }: MatrixRowProps) {
  const labelCell = (
    <TableCell
      className={cn(
        td,
        "sticky left-0 z-10 bg-card whitespace-nowrap",
        sub ? "pl-8" : "pl-3.5 font-semibold text-foreground",
      )}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-secondary transition-colors"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
            aria-hidden
          />
          {label}
        </button>
      ) : (
        label
      )}
    </TableCell>
  );

  return (
    <TableRow className={cn(sub && "bg-muted/20")}>
      {labelCell}
      {planets.map((p) => (
        <TableCell
          key={p.key}
          className={cn(
            td,
            num,
            bold ? "font-semibold text-foreground" : sub ? "" : "text-foreground/90",
            selectedKey === p.key && "bg-primary/10",
          )}
        >
          {value(p)}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function ShadbalaCard({
  data,
  yuddha,
  bhavaBala,
}: {
  data: ShadbalaResponse;
  /** Server-computed Graha Yuddha for the birth chart. */
  yuddha?: YuddhaData;
  /** Server-computed Bhava Bala (for the Bhava % row). */
  bhavaBala?: BhavaBalaData | null;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const { planets, summary } = data;
  const [openSthana, setOpenSthana] = useState(false);
  const [openKala, setOpenKala] = useState(false);
  const [scale, setScale] = useState<ShadbalaScale>("virupas");

  const ordered = orderShadbalaPlanets(planets);
  const [selectedKey, setSelectedKey] = useState(ordered[0]?.key ?? "sun");
  const grahaName = (key: string) =>
    GRAHA_NAME_I18N[key] ? t(GRAHA_NAME_I18N[key]) : grahaDisplayName(key, lang);
  const rankByKey = new Map(
    [...planets]
      .sort((a, b) => b.ratio - a.ratio)
      .map((p, i) => [p.key, i + 1]),
  );

  const hasSubs = ordered.some((p) => p.sub_balas != null);
  const hasPhala = ordered.some((p) => p.ishta_phala != null);
  const hasYuddhaActivity = (yuddha?.wars.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className={kundaliDetailClasses.glance.heading}>
          {t("kundali.shadbala_planetary_strength_virupas")}
        </h3>
        <p className={kundaliDetailClasses.glance.introSpaced}>
          {bilingualText(lang, tFor("ne", "ui.kundali.x_4836cfed"), data.method)}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <GlanceTile label={t("kundali.strongest_planet")}>
            <p className={kundaliDetailClasses.glance.name}>
              <span className={cn(kundaliDetailClasses.glance.nameRow, "inline-flex")}>
                <GrahaPlanetIcon graha={summary.strongest.key as GrahaKey} size={28} />
                {grahaName(summary.strongest.key)}
              </span>
            </p>
            <div className={cn(kundaliDetailClasses.glance.badgeRow, "flex")}>
              <StatusBadge status={summary.strongest.status} />
              <span className={kundaliDetailClasses.glance.sub}>
                {bilingualText(lang, tFor("ne", "ui.kundali.x_bab6a0ed", { v0: digits(summary.strongest.ratio.toFixed(2)) }), `${summary.strongest.ratio.toFixed(2)}x required`)}
              </span>
            </div>
          </GlanceTile>

          <GlanceTile label={t("kundali.weakest_planet")}>
            <p className={kundaliDetailClasses.glance.name}>
              <span className={cn(kundaliDetailClasses.glance.nameRow, "inline-flex")}>
                <GrahaPlanetIcon graha={summary.weakest.key as GrahaKey} size={28} />
                {grahaName(summary.weakest.key)}
              </span>
            </p>
            <div className={cn(kundaliDetailClasses.glance.badgeRow, "flex")}>
              <StatusBadge status={summary.weakest.status} />
              <span className={kundaliDetailClasses.glance.sub}>
                {bilingualText(lang, tFor("ne", "ui.kundali.x_bab6a0ed", { v0: digits(summary.weakest.ratio.toFixed(2)) }), `${summary.weakest.ratio.toFixed(2)}x required`)}
              </span>
            </div>
          </GlanceTile>

          <GlanceTile label={t("kundali.average_rupas")}>
            <p className={kundaliDetailClasses.glance.big}>
              {digits(summary.average_rupas.toFixed(2))}
            </p>
            <p className={kundaliDetailClasses.glance.subTight}>
              {digits(summary.average_virupas.toFixed(2))}{" "}
              {t("kundali.virupas")}
            </p>
          </GlanceTile>

          <GlanceTile label={t("kundali.planets_meeting_threshold")}>
            <p className={kundaliDetailClasses.glance.big}>
              {digits(summary.meeting_threshold)}
              <span className={kundaliDetailClasses.glance.bigOf}>
                {" "}
                / {digits(summary.total_planets)}
              </span>
            </p>
            <p className={kundaliDetailClasses.glance.subTight}>
              {t("kundali.adequate_or_stronger")}
            </p>
            <div className={cn(kundaliDetailClasses.glance.chips, "flex")}>
              {STATUS_ORDER.map((s) => (
                <span
                  key={s}
                  className={cn(
                    kundaliDetailClasses.glance.chip,
                    kundaliDetailClasses.glance.chipText,
                    "inline-flex",
                    summary.counts[s] > 0
                      ? STATUS_STYLES[s]
                      : "border-border"
                  )}
                >
                  {t(STATUS_LABEL[s])}{" "}
                  {digits(summary.counts[s])}
                </span>
              ))}
            </div>
          </GlanceTile>
        </div>
      </div>

      <ShadbalaChart
        planets={ordered}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        yuddha={yuddha}
        scale={scale}
        onScaleChange={setScale}
      />

      <div>
        <h4 className={kundaliDetailClasses.glance.tableTitle}>
          {t("kundali.shadbala_table")}
        </h4>
        <div className={kundaliDetailClasses.glance.tableWrap}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3.5")}>
                  {t("kundali.bala")}
                </TableHead>
                {ordered.map((p) => (
                  <TableHead
                    key={p.key}
                    className={cn(th, "text-right min-w-[5.25rem]", selectedKey === p.key && "bg-primary/10")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedKey(p.key)}
                      className="inline-flex items-center justify-end gap-1.5"
                    >
                      <GrahaPlanetIcon graha={p.key as GrahaKey} size={20} />
                      <span>{grahaName(p.key)}</span>
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <MatrixRow
                label={t("kundali.x.relative_rank")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => digits(String(rankByKey.get(p.key) ?? "—"))}
                bold
              />
              <MatrixRow
                label={t("kundali.x.bala_sthana")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.sthana, digits)}
                expandable={hasSubs}
                open={openSthana}
                onToggle={() => setOpenSthana((v) => !v)}
              />
              {openSthana && (
                <Fragment>
                  {STHANA_SUBS.map((row) => (
                    <MatrixRow
                      key={row.key}
                      label={t(row.label)}
                      planets={ordered}
                selectedKey={selectedKey}
                      value={(p) => fmt(p.sub_balas?.sthana?.[row.key], digits)}
                      sub
                    />
                  ))}
                </Fragment>
              )}
              <MatrixRow
                label={t("kundali.disha")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.dig, digits)}
              />
              <MatrixRow
                label={t("choghadiya.types.kala.name")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.kala, digits)}
                expandable={hasSubs}
                open={openKala}
                onToggle={() => setOpenKala((v) => !v)}
              />
              {openKala && (
                <Fragment>
                  {KALA_SUBS.map((row) => (
                    <MatrixRow
                      key={row.key}
                      label={t(row.label)}
                      planets={ordered}
                selectedKey={selectedKey}
                      value={(p) =>
                        row.key === "yuddha" && yuddha
                          ? fmt(yuddhaVirupasForPlanet(p, yuddha), digits)
                          : fmt(p.sub_balas?.kala?.[row.key], digits)
                      }
                      sub
                    />
                  ))}
                </Fragment>
              )}
              <MatrixRow
                label={t("kundali.x.bala_chesta")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.cheshta, digits)}
              />
              <MatrixRow
                label={t("kundali.x.bala_naisargika")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.naisargika, digits)}
              />
              <MatrixRow
                label={t("kundali.drishti")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.breakdown.drik, digits)}
              />
              <MatrixRow
                label={t("kundali.total_pinda")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.total_virupas, digits)}
                bold
              />
              <MatrixRow
                label={t("kundali.rupas")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.rupas, digits)}
              />
              <MatrixRow
                label={t("kundali.x.min_required")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.required / 60, digits)}
              />
              <MatrixRow
                label={t("kundali.x.strength_ratio")}
                planets={ordered}
                selectedKey={selectedKey}
                value={(p) => fmt(p.ratio, digits, 4)}
                bold
              />
              {bhavaBala && (
                <MatrixRow
                  label={t("kundali.x.bhava_percent")}
                  planets={ordered}
                selectedKey={selectedKey}
                  value={(p) => {
                    const pct = bhavaBala.rulershipPercent[p.key];
                    return pct != null ? `${digits(pct.toFixed(1))}%` : "—";
                  }}
                  bold
                />
              )}
              {hasPhala && (
                <Fragment>
                  <MatrixRow
                    label={t("kundali.x.ishta_phala")}
                    planets={ordered}
                selectedKey={selectedKey}
                    value={(p) => fmt(p.ishta_phala, digits)}
                  />
                  <MatrixRow
                    label={t("kundali.x.kashta_phala")}
                    planets={ordered}
                selectedKey={selectedKey}
                    value={(p) => fmt(p.kashta_phala, digits)}
                  />
                </Fragment>
              )}
              <TableRow>
                <TableCell className={cn(td, "sticky left-0 z-10 bg-card pl-3.5 font-semibold text-foreground")}>
                  {t("kundali.status")}
                </TableCell>
                {ordered.map((p) => (
                  <TableCell
                    key={p.key}
                    className={cn(td, "text-right", selectedKey === p.key && "bg-primary/10")}
                  >
                    <StatusBadge status={p.status} />
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className={kundaliDetailClasses.glance.tableNote}>
          {t("kundali.virupas_per_bala_expand_sthana_and_kala_for_component_s")}
          {bhavaBala && (
            <>
              {" "}
              {t("kundali.bhava_in_is_the_mean_house_strength_of_bhavas_ruled_by_")}
            </>
          )}
        </p>
        {hasYuddhaActivity && yuddha && (
          <p className={kundaliDetailClasses.glance.warn}>
            {t("kundali.graha_yuddha_detected")}{" "}
            {yuddha.wars
              .map((w) =>
                bilingualText(lang, tFor("ne", "ui.kundali.x_b48812f0", { v0: grahaName(w.winner), v1: grahaName(w.loser), v2: fmt(w.yuddhaVirupas, digits), v3: digits(w.separationDeg.toFixed(2)) }), `${grahaName(w.winner)} defeats ${grahaName(w.loser)} (${fmt(w.yuddhaVirupas, digits)} virupas, ${w.separationDeg.toFixed(2)}° apart)`),
              )
              .join("; ")}
            .
          </p>
        )}
      </div>
    </div>
  );
}
