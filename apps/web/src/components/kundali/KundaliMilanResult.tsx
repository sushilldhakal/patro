import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import type { AshtakutaResult } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { useKundaliMilanResult } from "@vedic-patro/features/kundali";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const m = kundaliDetailClasses.milanResult;

const RECOMMENDATION_TONE: Record<AshtakutaResult["recommendation"], string> = {
  excellent: m.recExcellent,
  very_good: m.recVeryGood,
  middling: m.recMiddling,
  inauspicious: m.recInauspicious,
};

type Kuta = ReturnType<typeof useKundaliMilanResult>["kutas"][number];

function KutaDetailPanel({ detail }: { detail: Kuta["detail"] }) {
  return (
    <div className={m.panel}>
      <p className={m.panelTitle}>{detail.title}</p>
      <p className={m.panelPoints}>
        {detail.pointsLabel} <span className={m.panelPointsValue}>{detail.points}</span>
      </p>
      <div className={cn(m.panelPeople, "grid sm:grid-cols-2")}>
        {detail.people.map((p, i) => (
          <div key={i} className={m.panelPerson}>
            <p className={m.panelPersonName}>{p.who}</p>
            <p className={m.panelPersonValue}>{p.value}</p>
          </div>
        ))}
      </div>
      <p className={m.panelInfo}>{detail.info}</p>
    </div>
  );
}

interface Props {
  boyName: string;
  girlName: string;
  result: AshtakutaResult;
}

export function KundaliMilanResult({ boyName, girlName, result }: Props) {
  const view = useKundaliMilanResult({ boyName, girlName, result });

  return (
    <div className={m.root}>
      <section className={cn(m.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
        <div className={m.totalRow}>
          <div>
            <p className={m.eyebrow}>{view.copy.totalGuna}</p>
            <p className={cn(m.recommendation, RECOMMENDATION_TONE[view.recommendation])}>{view.recommendationLabel}</p>
          </div>
          <div className="text-right">
            <p className={m.totalValue}>
              {view.total}
              <span className={m.totalMax}>{view.totalMax}</span>
            </p>
            <p className={m.gunaLabel}>{view.copy.guna}</p>
          </div>
        </div>
        <div className={cn(m.partners, m.partnerText)}>
          {view.partners.map((p) => (
            <span key={p.label} className={m.partner}>
              <span>{p.label}:</span> <span className={m.partnerName}>{p.name}</span>
            </span>
          ))}
        </div>
        {view.advisory ? (
          <div className={cn(m.advisory, m.advisoryText)} role="note">
            <p className={m.advisoryTitle}>{view.advisory.title}</p>
            <p>{view.advisory.text}</p>
          </div>
        ) : null}
      </section>

      <section className={m.card}>
        <h3 className={cn(m.cardTitle, "mb-4")}>{view.copy.doshaTitle}</h3>
        <ul className="divide-y divide-border/70">
          {view.doshas.map((dosha) => (
            <li key={dosha.id} className={cn(m.doshaRow, "first:pt-0 last:pb-0")}>
              <span className={m.doshaLabel}>
                {dosha.label}
                {dosha.alt && <span className={m.doshaLabelAlt}> {dosha.alt}</span>}
              </span>
              <span className={cn(m.doshaVerdict, dosha.present ? m.doshaPresent : m.doshaAbsent)}>{dosha.verdict}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={m.tableCard}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-8" />
              {view.columns.map((c, i) => (
                <TableHead key={i} className={cn((i === 1 || i === 2) && "text-center")}>
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.kutas.map((kuta) => (
              <Fragment key={kuta.id}>
                <TableRow className="cursor-pointer" onClick={kuta.toggle}>
                  <TableCell className="py-2">
                    <ChevronRight className={cn("size-4 transition-transform", kuta.open && "rotate-90")} />
                  </TableCell>
                  <TableCell className="text-base">{kuta.label}</TableCell>
                  <TableCell className="text-center tabular-nums">{kuta.max}</TableCell>
                  <TableCell className="text-center tabular-nums font-semibold">{kuta.obtained}</TableCell>
                  <TableCell>{kuta.boyValue}</TableCell>
                  <TableCell>{kuta.girlValue}</TableCell>
                  <TableCell>{kuta.area}</TableCell>
                </TableRow>
                {kuta.open ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-3 pt-0">
                      <KutaDetailPanel detail={kuta.detail} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <p className={m.tableFootnote}>{view.footnote}</p>
      </section>

      <section className={m.card}>
        <h3 className={cn(m.cardTitle, "mb-3")}>{view.copy.notesTitle}</h3>
        <ul className={cn("space-y-2", m.noteText, "list-disc pl-5")}>
          {view.notes.map((note) => (
            <li key={note.slice(0, 40)}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
