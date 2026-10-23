import { Compass } from "lucide-react";
import { useVastuPage, type VastuChip, type VastuDetailRow, type VastuDirChip, type VastuPage } from "@vedic-patro/features/vastu";
import { VASTU_INK, type VastuSelectionId } from "@vedic-patro/domain/vastu/vastu";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { PlotPlanner } from "@/components/vastu/PlotPlanner";
import { VastuPurushaWheel } from "@/components/vastu/VastuPurushaWheel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompassHeading } from "@/lib/compass-heading";
import { cn } from "@vedic-patro/design-tokens/cn";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

function Chip({ chip }: { chip: VastuChip }) {
  const style =
    chip.tone === "sattva"
      ? { backgroundColor: chip.color, color: VASTU_INK.text }
      : chip.tone === "tamas"
        ? { backgroundColor: chip.color, color: VASTU_INK.background }
        : { backgroundColor: `${chip.color}33`, color: chip.color };
  return (
    <span className={cn(vastuClasses.pill, vastuClasses.pillText)} style={style}>
      {chip.label}
    </span>
  );
}

function PadaStatusMark({ status }: { status: "good" | "ok" | "bad" | "mixed" }) {
  if (status === "mixed") {
    return (
      <span className={cn(vastuClasses.markStack, "inline-flex leading-[0.7] font-extrabold")} aria-hidden>
        <span className={vastuClasses.markStackPlus}>+</span>
        <span className={vastuClasses.markStackMinus}>−</span>
      </span>
    );
  }
  if (status === "good") return <span className={vastuClasses.markPlus}>+</span>;
  if (status === "bad") return <span className={vastuClasses.markMinus}>−</span>;
  return null;
}

function DetailValue({ row, onSelect }: { row: VastuDetailRow; onSelect: (id: VastuSelectionId) => void }) {
  if (row.kind === "text") {
    return <dd className={cn(vastuClasses.detailValue, row.danger ? vastuClasses.detailTextDanger : vastuClasses.detailText)}>{row.text}</dd>;
  }
  if (row.kind === "parent") {
    return (
      <dd className={vastuClasses.detailValue}>
        <button
          type="button"
          onClick={() => onSelect(row.id)}
          className={cn(vastuClasses.padaLink, vastuClasses.padaLinkText, vastuClasses.textIdle, "inline-flex hover:text-foreground")}
          style={{ borderColor: `${row.color}66` }}
        >
          {row.text}
        </button>
      </dd>
    );
  }
  return (
    <dd className={vastuClasses.detailValue}>
      <div className={vastuClasses.chipRow}>
        {row.padas.map((pada) => (
          <button
            key={pada.id}
            type="button"
            onClick={() => onSelect(pada.id)}
            className={cn(
              vastuClasses.padaLink,
              vastuClasses.padaLinkText,
              "inline-flex",
              pada.active ? vastuClasses.textActive : cn(vastuClasses.textIdle, "hover:text-foreground"),
            )}
            style={{ borderColor: pada.active ? pada.color : `${pada.color}66`, backgroundColor: pada.active ? `${pada.color}2e` : undefined }}
          >
            {pada.label}
            <PadaStatusMark status={pada.status} />
          </button>
        ))}
      </div>
    </dd>
  );
}

function ZoneDetail({ page }: { page: VastuPage }) {
  const { zone } = page;
  return (
    <div className={vastuClasses.zoneCard} style={{ borderColor: `${zone.color}66` }}>
      <div className={vastuClasses.zoneHeader}>
        <h3 className={vastuClasses.zoneTitle}>{zone.title}</h3>
        {zone.chips.map((chip) => (
          <Chip key={chip.key} chip={chip} />
        ))}
      </div>
      {zone.importance ? <p className={vastuClasses.zoneImportance}>{zone.importance}</p> : null}
      <dl className={vastuClasses.detailList}>
        {zone.rows.map((row) => (
          <div key={row.key} className={vastuClasses.detailRow}>
            <dt className={vastuClasses.detailLabel}>{row.label}</dt>
            <DetailValue row={row} onSelect={page.select} />
          </div>
        ))}
      </dl>
    </div>
  );
}

function DirChips({ chips, onSelect }: { chips: VastuDirChip[]; onSelect: (id: VastuSelectionId) => void }) {
  return (
    <div className={vastuClasses.chipRow}>
      {chips.map((dir) => (
        <button
          key={dir.id}
          type="button"
          onClick={() => onSelect(dir.id)}
          aria-pressed={dir.active}
          title={dir.title}
          className={cn(
            vastuClasses.dirChip,
            vastuClasses.dirChipText,
            "transition-colors",
            dir.active ? vastuClasses.textActive : cn(vastuClasses.textIdle, "hover:text-foreground"),
          )}
          style={{ borderColor: dir.active ? dir.color : `${dir.color}55`, backgroundColor: dir.active ? `${dir.color}2e` : undefined }}
        >
          {dir.label}
        </button>
      ))}
    </div>
  );
}

/** Vastu — the website's drawing of `useVastuPage` (@vedic-patro/features). */
export function Vastu() {
  useRouteLoading(false);
  const page = useVastuPage({
    useCompass: useCompassHeading,
    canUseCompass: () => typeof window === "undefined" || window.isSecureContext,
  });
  const { copy, compass, dialog } = page;

  return (
    <PageShell>
      <PageHeader icon={<Compass className="h-7 w-7 text-secondary" />} title={copy.title} subtitle={copy.subtitle} />

      <section className={vastuClasses.section}>
        <header className={vastuClasses.sectionHeader}>
          <Compass className="h-4 w-4 shrink-0 text-secondary" />
          <h2 className={vastuClasses.sectionHeading}>{copy.planHeading}</h2>
          <span className={vastuClasses.sectionHint}>{copy.planHint}</span>
        </header>

        <div className={vastuClasses.planBody}>
          <p className={vastuClasses.planBlurb}>{copy.wheelBlurb}</p>
          <div className="space-y-5">
            <div className="-mx-1 sm:mx-0">
              <VastuPurushaWheel selected={page.selected} onSelect={page.select} headingDeg={compass.heading} />
            </div>
            {compass.live ? (
              <div className={vastuClasses.compassBar}>
                <Compass className="h-4 w-4 shrink-0 text-secondary" />
                <p className={vastuClasses.compassText}>
                  {compass.line}
                  {compass.drifting ? <span className={cn(vastuClasses.compassDrift, "block")}>{copy.compassDrifting}</span> : null}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={compass.stop}>
                  {copy.compassStop}
                </Button>
              </div>
            ) : null}
            <ZoneDetail page={page} />
          </div>

          <DirChips chips={page.directions} onSelect={page.select} />
          <DirChips chips={page.directions16} onSelect={page.select} />
        </div>
      </section>

      <PlotPlanner />

      <p className={cn(vastuClasses.note, vastuClasses.noteText)}>{copy.note}</p>

      <section className={vastuClasses.sourcesCard}>
        <h2 className={vastuClasses.sourcesHeading}>{copy.sourcesHeading}</h2>
        <p className={vastuClasses.sourcesBlurb}>{copy.sourcesBlurb}</p>
        <ol className={vastuClasses.sourcesList}>
          {page.sources.map((source) => (
            <li key={source.id} className={cn(vastuClasses.sourceRow, "text-sm")}>
              <span className={vastuClasses.sourceIndex}>{source.index}</span>
              <div className={vastuClasses.sourceBody}>
                <p className={vastuClasses.sourceCredit}>{source.credit}</p>
                <p className={vastuClasses.sourceLine}>{source.edition}</p>
                <p className={vastuClasses.sourceLine}>{source.used}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
        <DialogContent className="z-[130]" overlayClassName="z-[130]">
          <DialogHeader>
            <DialogTitle>{copy.dialogTitle}</DialogTitle>
            <DialogDescription>{copy.dialogBody}</DialogDescription>
          </DialogHeader>
          {dialog.error ? <p className={vastuClasses.errorText}>{dialog.error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.setOpen(false)}>
              {copy.cancel}
            </Button>
            <Button type="button" onClick={dialog.confirm}>
              {copy.done}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default Vastu;
