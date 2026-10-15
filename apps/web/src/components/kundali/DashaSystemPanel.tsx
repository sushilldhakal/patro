import type { DashaSystem, DashaTreeResponse } from "@/lib/api";
import { DashaTree } from "@/components/kundali/DashaTree";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useDashaSystemPanel } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type DashaSystemPanelProps = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  /** Controlled tab — used when the kundali hash names a dasha system. */
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
};

export function DashaSystemPanel({ timeZone, ...input }: DashaSystemPanelProps) {
  const panel = useDashaSystemPanel(input);

  if (!panel.hasAny) return null;

  return (
    <div className={kundaliDetailClasses.dashaSystem.root}>
      <div className={kundaliDetailClasses.subTabs.tabsBar} role="tablist" aria-label={panel.tabsLabel}>
        {panel.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.selected}
            onClick={() => panel.setActive(tab.id)}
            className={cn(
              kundaliDetailClasses.subTabs.tab,
              kundaliDetailClasses.subTabs.tabText,
              "transition-colors",
              tab.selected
                ? cn(kundaliDetailClasses.subTabs.tabActive, kundaliDetailClasses.subTabs.tabActiveText, "shadow-sm ring-1 ring-border/60")
                : "hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel.birth ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className={cn(kundaliDetailClasses.dashaSystem.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]")}>
            <p className={cn(kundaliDetailClasses.dashaSystem.cardLabel, "truncate")}>{panel.birth.label}</p>
            <p className={kundaliDetailClasses.dashaSystem.lord}>
              <span className={cn(kundaliDetailClasses.dashaSystem.lordRow, "inline-flex")}>
                {panel.birth.grahaKey ? <GrahaPlanetIcon graha={panel.birth.grahaKey} size={28} /> : null}
                {panel.birth.lord}
              </span>
            </p>
            <p className={kundaliDetailClasses.dashaSystem.balance}>{panel.birth.balance}</p>
          </div>
        </div>
      ) : null}

      {panel.tree ? (
        <DashaTree
          tree={panel.tree}
          timeZone={timeZone}
          system={panel.system}
          maxLevel={panel.maxLevel}
          cycleYears={panel.cycleYears}
        />
      ) : (
        <p className={kundaliDetailClasses.dashaSystem.empty}>{panel.empty}</p>
      )}
    </div>
  );
}
