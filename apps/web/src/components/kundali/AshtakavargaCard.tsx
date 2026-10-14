import type { AshtakavargaData } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useAshtakavargaCard } from "@vedic-patro/features/kundali";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Card = ReturnType<typeof useAshtakavargaCard>;

const th = "h-auto py-2 px-2 text-sm font-semibold tracking-wide whitespace-nowrap";
const thGraha = cn(th, "text-right min-w-[4.75rem] normal-case align-bottom");
const av = kundaliDetailClasses.ashtakavarga;
const td = av.td;
const num = av.num;

function AshtakavargaTargetHead({ target }: { target: Card["targets"][number] }) {
  if (target.graha) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <GrahaPlanetIcon graha={target.key as GrahaKey} size={18} />
        <span className={av.targetLabel}>{target.label}</span>
      </span>
    );
  }
  return <span className={av.targetLabel}>{target.label}</span>;
}

function AshtakavargaMatrix({
  card,
  matrix,
  showSarvashtaka = true,
}: {
  card: Card;
  matrix: Card["matrices"][number];
  showSarvashtaka?: boolean;
}) {
  return (
    <div>
      <h4 className={av.blockTitle}>{matrix.title}</h4>
      <div className={av.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3 min-w-[5.5rem] uppercase")}>
                {card.rashiHeader}
              </TableHead>
              {card.targets.map((tg) => (
                <TableHead key={tg.key} className={thGraha}>
                  <AshtakavargaTargetHead target={tg} />
                </TableHead>
              ))}
              {showSarvashtaka && (
                <TableHead className={cn(th, "text-right min-w-[3rem] uppercase")}>{card.sarvHeader}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.map((row) => (
              <TableRow key={row.rashi}>
                <TableCell className={cn(td, "sticky left-0 z-10 bg-card pl-3 font-semibold text-foreground")}>
                  <span className="inline-flex items-center gap-2">
                    <RashiGlyphIcon name={row.rashiNe} number={row.rashi} size={22} />
                    {row.name}
                  </span>
                </TableCell>
                {row.values.map((v, i) => (
                  <TableCell key={card.targets[i]!.key} className={cn(td, num)}>
                    {v}
                  </TableCell>
                ))}
                {showSarvashtaka && (
                  <TableCell className={cn(td, num, "font-semibold")}>{row.sarvashtaka}</TableCell>
                )}
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className={cn(td, "sticky left-0 z-10 bg-muted/30 pl-3")}>{card.totalLabel}</TableCell>
              {matrix.totals.map((v, i) => (
                <TableCell key={card.targets[i]!.key} className={cn(td, num)}>
                  {v}
                </TableCell>
              ))}
              {showSarvashtaka && <TableCell className={cn(td, num)}>{matrix.sarvTotal}</TableCell>}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ShodhyaPindaTable({ card }: { card: Card }) {
  return (
    <div>
      <h4 className={av.blockTitle}>{card.shodhya.title}</h4>
      <div className={av.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3")} />
              {card.targets.map((tg) => (
                <TableHead key={tg.key} className={thGraha}>
                  <AshtakavargaTargetHead target={tg} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {card.shodhya.rows.map((metric) => (
              <TableRow key={metric.key} className={metric.emphasize ? "bg-muted/20 font-semibold" : undefined}>
                <TableCell className={cn(td, "sticky left-0 z-10 bg-card pl-3 font-semibold")}>{metric.label}</TableCell>
                {metric.values.map((v, i) => (
                  <TableCell key={card.targets[i]!.key} className={cn(td, num)}>
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AshtakavargaCard({ data }: { data: AshtakavargaData }) {
  const card = useAshtakavargaCard(data);

  return (
    <div className={av.root}>
      <div>
        <h3 className={av.heading}>{card.title}</h3>
        <p className={av.intro}>{card.intro}</p>
      </div>

      {card.matrices.map((m) => (
        <AshtakavargaMatrix key={m.key} card={card} matrix={m} />
      ))}

      <ShodhyaPindaTable card={card} />
    </div>
  );
}
