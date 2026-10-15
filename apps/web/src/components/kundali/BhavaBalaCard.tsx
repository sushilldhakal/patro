import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { BhavaBalaChart } from "@/components/kundali/BhavaBalaChart";
import { useBhavaBalaSelection, useBhavaBalaTable } from "@vedic-patro/features/kundali";
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

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-1.5 text-sm";
const num = "text-right font-mono tabular-nums";

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

export function BhavaBalaCard({
  data,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const { selectedHouse, selectHouse } = useBhavaBalaSelection(data);

  return (
    <div className="space-y-6">
      <BhavaBalaChart
        data={data}
        selectedHouse={selectedHouse}
        onSelectHouse={selectHouse}
        vargaCharts={vargaCharts}
        combustion={combustion}
      />
      <BhavaBalaTable data={data} selectedHouse={selectedHouse} onSelectHouse={selectHouse} />
    </div>
  );
}

export function BhavaBalaTable({
  data,
  selectedHouse,
  onSelectHouse,
}: {
  data: BhavaBalaData;
  selectedHouse?: number;
  onSelectHouse?: (house: number) => void;
}) {
  const table = useBhavaBalaTable(data);

  return (
    <div className="space-y-4">
      <div>
        <h3 className={kundaliDetailClasses.glance.heading}>{table.title}</h3>
        <p className={kundaliDetailClasses.glance.intro}>{table.intro}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[table.strongest, table.weakest].map((s) => (
          <GlanceTile key={s.label} label={s.label}>
            <p className={kundaliDetailClasses.glance.name}>{s.name}</p>
            <p className={kundaliDetailClasses.glance.subTight}>
              {s.lordLabel} {s.lordName}
              <span className="mx-1">·</span>
              {s.percent}
            </p>
          </GlanceTile>
        ))}
      </div>

      <div className={kundaliDetailClasses.glance.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {table.columns.map((c, i) => (
                <TableHead key={c.key} className={cn(th, i === 0 ? "pl-3.5" : "text-right")}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((h) => {
              const selected = selectedHouse === h.house;
              return (
                <TableRow
                  key={h.house}
                  data-state={selected ? "selected" : undefined}
                  className={cn(onSelectHouse && "cursor-pointer", selected && "bg-primary/10")}
                  onClick={onSelectHouse ? () => onSelectHouse(h.house) : undefined}
                >
                  <TableCell className={cn(td, "font-semibold pl-3.5")}>{h.label}</TableCell>
                  <TableCell className={cn(td, "text-right")}>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <GrahaPlanetIcon graha={h.lordKey as GrahaKey} size={20} />
                      {h.lordName}
                    </span>
                  </TableCell>
                  <TableCell className={cn(td, num)}>{h.bhavadhipati}</TableCell>
                  <TableCell className={cn(td, num)}>{h.disha}</TableCell>
                  <TableCell className={cn(td, num)}>{h.drishti}</TableCell>
                  <TableCell className={cn(td, num, "font-semibold")}>{h.totalPinda}</TableCell>
                  <TableCell className={cn(td, num, "font-semibold")}>{h.percent}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
