import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { DashaSystem, DashaTreeResponse } from "@/lib/api";
import { DashaTree } from "@/components/kundali/DashaTree";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import {
  DASHA_LORD_EN,
  DASHA_LORD_NE,
  dashaMahadashaGrahaKey,
  type DashaLord,
} from "@/lib/dasha";
import { cn } from "@/lib/utils";

type DashaTab = {
  id: DashaSystem;
  /** Catalogue key for the tab label. */
  labelKey: string;
  data: DashaTreeResponse | null | undefined;
  maxLevel: number;
};

type DashaSystemPanelProps = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  /** Controlled tab — used when the kundali hash names a dasha system. */
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
};

export function DashaSystemPanel({
  vimshottari,
  tribhagi,
  yogini,
  timeZone,
  active: activeProp,
  onActiveChange,
}: DashaSystemPanelProps) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const tabs: DashaTab[] = [
    {
      id: "vimshottari",
      labelKey: "kundali.x.dasha_system_vimshottari",
      data: vimshottari,
      maxLevel: 4,
    },
    {
      id: "tribhagi",
      labelKey: "kundali.x.dasha_system_tribhagi",
      data: tribhagi,
      maxLevel: 4,
    },
    {
      id: "yogini",
      labelKey: "kundali.x.dasha_system_yogini",
      data: yogini,
      maxLevel: 1,
    },
  ];
  const [uncontrolled, setUncontrolled] = useState<DashaSystem>("vimshottari");
  const active = activeProp ?? uncontrolled;
  const setActive = (id: DashaSystem) => {
    onActiveChange?.(id);
    if (activeProp == null) setUncontrolled(id);
  };
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]!;
  const dasha = current.data;

  if (!vimshottari && !tribhagi && !yogini) return null;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1"
        role="tablist"
        aria-label={t("kundali.dasha_system")}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              active === tab.id
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {dasha ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/80 bg-card px-3.5 py-3 min-w-0 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-1 truncate">
              {t("kundali.mahadasha_at_birth")}
            </p>
            {(() => {
              const grahaKey = dashaMahadashaGrahaKey(current.id, dasha.mahadasha_lord);
              const lordLabel =
                current.id === "yogini"
                  ? bilingualText(lang, dasha.mahadasha_lord_ne, dasha.mahadasha_lord)
                  : bilingualText(
                      lang,
                      DASHA_LORD_NE[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord_ne,
                      DASHA_LORD_EN[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord,
                    );
              return (
                <>
                  <p className="text-base font-bold text-foreground leading-tight">
                    <span className="inline-flex items-center gap-2">
                      {grahaKey ? <GrahaPlanetIcon graha={grahaKey} size={28} /> : null}
                      {lordLabel}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5">
                    {bilingualText(lang, `बाँकी अवधि: ${dasha.balance_label}`, `Balance: ${dasha.balance_label}`)}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {dasha?.tree?.length ? (
        <DashaTree
          tree={dasha.tree}
          timeZone={timeZone}
          system={current.id}
          maxLevel={current.maxLevel}
          cycleYears={current.id === "yogini" ? yogini?.cycle_years : undefined}
        />
      ) : (
        <p className="text-sm">
          {t("kundali.dasha_details_are_not_available")}
        </p>
      )}
    </div>
  );
}
