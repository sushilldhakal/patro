import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { createContext, useContext } from "react";
import { Outlet } from "@tanstack/react-router";
import { PanchangaSidebarNav } from "@/components/panchanga/PanchangaSidebarNav";
import { cn } from "@vedic-patro/design-tokens/cn";

const PanchangaShellContext = createContext(false);

export function useInPanchangaShell() {
  return useContext(PanchangaShellContext);
}

const SIDEBAR_CLASS =
  "hidden calendar:sticky calendar:top-20 calendar:block w-56 shrink-0 self-start";

/** Persistent sidebar shell — survives client navigations between panchanga pages. */
export function PanchangaShellLayout() {
  return (
    <PanchangaShellContext.Provider value={true}>
      <main className={panchangaPageClasses.directory.shellMain}>
        <div className={cn("flex", panchangaPageClasses.directory.shellRow)}>
          <PanchangaSidebarNav className={SIDEBAR_CLASS} />
          <div className={panchangaPageClasses.directory.shellContent}>
            <Outlet />
          </div>
        </div>
      </main>
    </PanchangaShellContext.Provider>
  );
}
