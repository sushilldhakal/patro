/**
 * The dasha system panel, shared by the website's and the app's
 * `components/kundali/DashaSystemPanel.tsx`: the vimshottari / tribhagi /
 * yogini tabs (controlled or uncontrolled), the mahadasha-at-birth card and
 * the empty line. Each app draws the tabs and its own `DashaTree`.
 */
import { useState } from "react";
import type { DashaSystem, DashaTreeResponse } from "@vedic-patro/api-client";
import { DASHA_LORD_EN, DASHA_LORD_NE, dashaMahadashaGrahaKey, type DashaLord } from "@vedic-patro/domain/dasha";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

const DASHA_TABS = [
  { id: "vimshottari", labelKey: "kundali.x.dasha_system_vimshottari", maxLevel: 4 },
  { id: "tribhagi", labelKey: "kundali.x.dasha_system_tribhagi", maxLevel: 4 },
  { id: "yogini", labelKey: "kundali.x.dasha_system_yogini", maxLevel: 1 },
] as const satisfies readonly { id: DashaSystem; labelKey: string; maxLevel: number }[];

export type DashaSystemPanelInput = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  /** Controlled tab — used when the kundali hash / section nav names a dasha system. */
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
};

export function useDashaSystemPanel({ vimshottari, tribhagi, yogini, active: activeProp, onActiveChange }: DashaSystemPanelInput) {
  const { t, lang } = useLocale();
  const byId: Record<DashaSystem, DashaTreeResponse | null | undefined> = { vimshottari, tribhagi, yogini };
  const [uncontrolled, setUncontrolled] = useState<DashaSystem>("vimshottari");
  const active = activeProp ?? uncontrolled;
  const setActive = (id: DashaSystem) => {
    onActiveChange?.(id);
    if (activeProp == null) setUncontrolled(id);
  };
  const current = DASHA_TABS.find((tab) => tab.id === active) ?? DASHA_TABS[0];
  const dasha = byId[current.id];

  const birth = dasha
    ? {
        label: t("kundali.mahadasha_at_birth"),
        grahaKey: dashaMahadashaGrahaKey(current.id, dasha.mahadasha_lord),
        lord:
          current.id === "yogini"
            ? bilingualText(lang, dasha.mahadasha_lord_ne, dasha.mahadasha_lord)
            : bilingualText(
                lang,
                DASHA_LORD_NE[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord_ne,
                DASHA_LORD_EN[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord,
              ),
        balance: t("ui.kundali.balance_balance_label", { balance_label: dasha.balance_label }),
      }
    : null;

  return {
    /** False when no system has data; the panel draws nothing then. */
    hasAny: Boolean(vimshottari || tribhagi || yogini),
    tabsLabel: t("kundali.dasha_system"),
    tabs: DASHA_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey), selected: tab.id === active })),
    active,
    setActive,
    system: current.id,
    maxLevel: current.maxLevel,
    tree: dasha?.tree?.length ? dasha.tree : null,
    cycleYears: current.id === "yogini" ? yogini?.cycle_years : undefined,
    birth,
    empty: t("kundali.dasha_details_are_not_available"),
  };
}
