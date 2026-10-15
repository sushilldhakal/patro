import { Input } from "@/components/ui/input";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import type { CardinalWall } from "@vedic-patro/domain/vastu";
import { usePlotPlanner, type VastuPlannerStorage } from "@vedic-patro/features/vastu";
import { HouseRequirementsForm } from "./HouseRequirementsForm";
import { HouseSketch } from "./HouseSketch";
import { OwnerCompatibility } from "./OwnerCompatibility";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

const STORAGE: VastuPlannerStorage = { read: getLocalStorageItem, write: setLocalStorageItem };

const selectClass = cn(vastuClasses.selectControl, "cursor-pointer");

export function PlotPlanner() {
  const v = usePlotPlanner({ storage: STORAGE });
  const { copy, plot, errors } = v;

  return (
    <section className={vastuClasses.section}>
      <header className={vastuClasses.sectionHeader}>
        <h2 className={vastuClasses.sectionHeading}>{copy.heading}</h2>
      </header>

      <div className={vastuClasses.plotBody}>
        <p className={vastuClasses.planBlurb}>{copy.blurb}</p>

        <OwnerCompatibility />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="plot-length" className={cn(vastuClasses.fieldLabel, "block")}>
              {copy.lengthLabel}
            </label>
            <Input
              id="plot-length"
              type="number"
              inputMode="decimal"
              value={plot.length}
              onChange={(e) => v.update({ length: e.target.value })}
              aria-invalid={errors.length}
            />
          </div>
          <div>
            <label htmlFor="plot-breadth" className={cn(vastuClasses.fieldLabel, "block")}>
              {copy.breadthLabel}
            </label>
            <Input
              id="plot-breadth"
              type="number"
              inputMode="decimal"
              value={plot.breadth}
              onChange={(e) => v.update({ breadth: e.target.value })}
              aria-invalid={errors.breadth}
            />
          </div>
        </div>

        <div>
          <label htmlFor="plot-facing" className={cn(vastuClasses.fieldLabel, "block")}>
            {copy.facingLabel}
          </label>
          <select
            id="plot-facing"
            className={cn(selectClass, "w-full sm:w-auto")}
            value={plot.facing}
            onChange={(e) => v.update({ facing: e.target.value as CardinalWall })}
          >
            {v.facingOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {copy.rangeError && <p className={vastuClasses.destructiveText}>{copy.rangeError}</p>}

        <HouseRequirementsForm plan={v.house} onChange={v.updateHouse} />

        <div className={vastuClasses.layoutCard}>
          <h3 className={vastuClasses.layoutHeading}>{copy.layoutHeading}</h3>
          <p className={vastuClasses.layoutBlurb}>{copy.layoutBlurb}</p>
          {copy.sketchStatus && (
            <p className={vastuClasses.layoutStatus} role="status">
              {copy.sketchStatus}
            </p>
          )}
          {v.cannotFit && (
            <div className={vastuClasses.cannotFit}>
              <p className={vastuClasses.cannotFitHeading}>{v.cannotFit.heading}</p>
              <p className={vastuClasses.cannotFitBlurb}>{v.cannotFit.blurb}</p>
              <ul className={vastuClasses.cannotFitList}>
                {v.cannotFit.items.map((item) => (
                  <li key={item.id} className={cn(vastuClasses.cannotFitItem, vastuClasses.cannotFitItemText)}>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={vastuClasses.storeyList}>
            {v.storeys.map((s) => (
              <div key={s.storey} className="min-w-0">
                {s.title && <h4 className={vastuClasses.storeyTitle}>{s.title}</h4>}
                <HouseSketch plot={v.footprint} facing={plot.facing} assignments={s.assignments} />
              </div>
            ))}
          </div>
          <p className={vastuClasses.mutedNoteTop}>{copy.disclaimer}</p>
          <p className={vastuClasses.mutedNoteTop}>{copy.bufferNote}</p>
          <p className={vastuClasses.mutedNote}>{copy.marmaNote}</p>
        </div>

        {v.ayadiCard && v.entranceCard && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={vastuClasses.infoCard}>
              <h3 className={vastuClasses.infoHeading}>{v.ayadiCard.heading}</h3>
              <dl className={cn(vastuClasses.infoRows, "text-sm")}>
                {v.ayadiCard.rows.map((row) => (
                  <div key={row.key} className={vastuClasses.infoRow}>
                    <dt className={vastuClasses.infoLabel}>{row.label}</dt>
                    <dd className={row.strong ? "font-semibold" : undefined}>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p
                className={cn(
                  vastuClasses.ayadiVerdict,
                  v.ayadiCard.auspicious ? vastuClasses.ayadiGood : vastuClasses.ayadiBad,
                )}
              >
                {v.ayadiCard.verdict}
              </p>
              {v.ayadiCard.suggestion && <p className={vastuClasses.infoParagraphTight}>{v.ayadiCard.suggestion}</p>}
              <p className={vastuClasses.infoDisclaimer}>{v.ayadiCard.disclaimer}</p>
            </div>

            <div className={vastuClasses.infoCard}>
              <h3 className={vastuClasses.infoHeading}>{v.entranceCard.heading}</h3>
              <p className={vastuClasses.infoParagraph}>{v.entranceCard.note}</p>
              <p className={vastuClasses.infoDisclaimer}>{v.entranceCard.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PlotPlanner;
