import { ChevronRight } from "lucide-react";
import type { BhavaBalaData, ShadbalaResponse, ShadbalaStatus, YuddhaData } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { ShadbalaChart } from "@/components/kundali/ShadbalaChart";
import { useShadbalaCard, type ShadbalaMatrixRow } from "@vedic-patro/features/kundali";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

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

function StatusBadge({ status, label }: { status: ShadbalaStatus; label: string }) {
  return (
    <span className={cn("inline-flex", kundaliDetailClasses.parts.statusBadge, STATUS_STYLES[status])}>
      {label}
    </span>
  );
}

function GlanceTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={kundaliDetailClasses.glance.card}>
      <p className={kundaliDetailClasses.glance.label}>{label}</p>
      {children}
    </div>
  );
}

function MatrixRow({ row, planetKeys, selectedKey }: { row: ShadbalaMatrixRow; planetKeys: string[]; selectedKey: string }) {
  return (
    <TableRow className={cn(row.sub && "bg-muted/20")}>
      <TableCell
        className={cn(
          td,
          "sticky left-0 z-10 bg-card whitespace-nowrap",
          row.sub ? "pl-8" : "pl-3.5 font-semibold text-foreground",
        )}
      >
        {row.expandable ? (
          <button
            type="button"
            onClick={row.toggle}
            aria-expanded={row.open}
            className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-secondary transition-colors"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", row.open && "rotate-90")} aria-hidden />
            {row.label}
          </button>
        ) : (
          row.label
        )}
      </TableCell>
      {row.values.map((value, i) =>
        row.statuses ? (
          <TableCell key={planetKeys[i]} className={cn(td, "text-right", selectedKey === planetKeys[i] && "bg-primary/10")}>
            <StatusBadge status={row.statuses[i]!} label={value} />
          </TableCell>
        ) : (
          <TableCell
            key={planetKeys[i]}
            className={cn(
              td,
              num,
              row.bold ? "font-semibold text-foreground" : row.sub ? "" : "text-foreground/90",
              selectedKey === planetKeys[i] && "bg-primary/10",
            )}
          >
            {value}
          </TableCell>
        ),
      )}
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
  const card = useShadbalaCard({ data, yuddha, bhavaBala });
  const planetKeys = card.planets.map((p) => p.key);

  return (
    <div className="space-y-6">
      <div>
        <h3 className={kundaliDetailClasses.glance.heading}>{card.title}</h3>
        <p className={kundaliDetailClasses.glance.introSpaced}>{card.method}</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[card.strongest, card.weakest].map((g) => (
            <GlanceTile key={g.label} label={g.label}>
              <p className={kundaliDetailClasses.glance.name}>
                <span className={cn(kundaliDetailClasses.glance.nameRow, "inline-flex")}>
                  <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
                  {g.name}
                </span>
              </p>
              <div className={cn(kundaliDetailClasses.glance.badgeRow, "flex")}>
                <StatusBadge status={g.status} label={card.statusLabel(g.status)} />
                <span className={kundaliDetailClasses.glance.sub}>{g.sub}</span>
              </div>
            </GlanceTile>
          ))}

          <GlanceTile label={card.average.label}>
            <p className={kundaliDetailClasses.glance.big}>{card.average.rupas}</p>
            <p className={kundaliDetailClasses.glance.subTight}>{card.average.virupas}</p>
          </GlanceTile>

          <GlanceTile label={card.threshold.label}>
            <p className={kundaliDetailClasses.glance.big}>
              {card.threshold.count}
              <span className={kundaliDetailClasses.glance.bigOf}>{card.threshold.of}</span>
            </p>
            <p className={kundaliDetailClasses.glance.subTight}>{card.threshold.sub}</p>
            <div className={cn(kundaliDetailClasses.glance.chips, "flex")}>
              {card.threshold.chips.map((c) => (
                <span
                  key={c.status}
                  className={cn(
                    kundaliDetailClasses.glance.chip,
                    kundaliDetailClasses.glance.chipText,
                    "inline-flex",
                    c.active ? STATUS_STYLES[c.status] : "border-border",
                  )}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </GlanceTile>
        </div>
      </div>

      <ShadbalaChart
        planets={card.planets}
        selectedKey={card.selectedKey}
        onSelect={card.select}
        yuddha={yuddha}
        scale={card.scale}
        onScaleChange={card.setScale}
      />

      <div>
        <h4 className={kundaliDetailClasses.glance.tableTitle}>{card.tableTitle}</h4>
        <div className={kundaliDetailClasses.glance.tableWrap}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3.5")}>{card.balaHeader}</TableHead>
                {card.planets.map((p) => (
                  <TableHead
                    key={p.key}
                    className={cn(th, "text-right min-w-[5.25rem]", card.selectedKey === p.key && "bg-primary/10")}
                  >
                    <button type="button" onClick={() => card.select(p.key)} className="inline-flex items-center justify-end gap-1.5">
                      <GrahaPlanetIcon graha={p.key as GrahaKey} size={20} />
                      <span>{card.grahaName(p.key)}</span>
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {card.rows.map((row) => (
                <MatrixRow key={row.key} row={row} planetKeys={planetKeys} selectedKey={card.selectedKey} />
              ))}
            </TableBody>
          </Table>
        </div>
        <p className={kundaliDetailClasses.glance.tableNote}>{card.note}</p>
        {card.yuddhaLine && <p className={kundaliDetailClasses.glance.warn}>{card.yuddhaLine}</p>}
      </div>
    </div>
  );
}
