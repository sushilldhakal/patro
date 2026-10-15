import type { ReactNode } from "react";
import { LayoutGrid, Sunrise } from "lucide-react";
import type { CalcNote, GrahaSpashtaRow, LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useDayPatroExpand } from "@vedic-patro/features/dainik-kranti";
import { PatroSolarCorrectionStrip } from "@/components/dainikKranti/PatroSolarCorrectionStrip";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";

type Props = {
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
};

const LAGNA_GRID =
  "grid w-full min-w-0 grid-cols-4 gap-1.5 sm:gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12";

const GRAHA_GRID =
  "grid w-full min-w-0 grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4";

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn(dainikKrantiClasses.sectionHead, dainikKrantiClasses.sectionHeadText, "hidden md:flex")}>
      <span className="text-secondary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </div>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const panel = useDayPatroExpand({ lagna, graha, notes });
  // <md: one section at a time behind tabs; md+: all stacked as before.
  const pane = (id: string) => (panel.tab === id ? "block" : "hidden md:block");
  return (
    <div className={cn(dainikKrantiClasses.expandRoot, "space-y-4")}>
      {panel.hasTabs ? (
        <div role="tablist" className={cn(dainikKrantiClasses.expandTabs, "md:hidden")}>
          {panel.tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={x.active}
              onClick={x.select}
              className={cn(
                dainikKrantiClasses.expandTab,
                x.active ? dainikKrantiClasses.expandTabOn : dainikKrantiClasses.expandTabOff,
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      ) : null}
      {panel.lagna ? (
        <div className={cn("w-full min-w-0", pane("lagna"))}>
          <SectionHeading icon={<LayoutGrid />}>{panel.lagna.title}</SectionHeading>
          <div className={LAGNA_GRID}>
            {panel.lagna.cells.map((c) => (
              <div
                key={c.key}
                className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell, "text-center")}
              >
                <div className="flex justify-center">
                  <RashiGlyphIcon name={c.rashiNe} number={c.number} size={22} />
                </div>
                <div className={dainikKrantiClasses.lagnaName}>{c.name}</div>
                <div
                  className={cn(
                    dainikKrantiClasses.lagnaTime,
                    "break-all",
                    c.late ? dainikKrantiClasses.lateText : "text-foreground",
                  )}
                >
                  {c.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {panel.graha ? (
        <div className={cn("w-full min-w-0 space-y-3", pane("graha"))}>
          <SectionHeading icon={<Sunrise />}>{panel.graha.title}</SectionHeading>
          <div className={GRAHA_GRID}>
            {panel.graha.cells.map((cell) => (
              <div
                key={cell.key}
                className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}
              >
                <div className={cn(dainikKrantiClasses.grahaNameRow, dainikKrantiClasses.grahaNameText)}>
                  <GrahaPlanetIcon graha={cell.key as GrahaKey} size={20} />
                  {cell.name}
                  <GrahaStatusBadges
                    planetKey={cell.key}
                    isRetrograde={cell.isRetrograde}
                    isCombust={cell.isCombust}
                    size={12}
                  />
                </div>
                <div className={cn(dainikKrantiClasses.grahaCoords, "break-words")}>
                  <span className={dainikKrantiClasses.grahaRashi}>{cell.rashi}</span>{" "}
                  {cell.coords}
                </div>
              </div>
            ))}
          </div>
          <PatroSolarCorrectionStrip {...panel.graha.solar} />
        </div>
      ) : null}

      {panel.notes.length > 0 ? (
        <ul className={cn("w-full min-w-0 space-y-1.5 text-sm", pane("notes"))}>
          {panel.notes.map((n) => (
            <li key={n.key} className="break-words">
              <span className={dainikKrantiClasses.noteText}>{n.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
