import { createContext, useContext } from "react";
import { Outlet } from "@tanstack/react-router";
import { PanchangaSidebarNav } from "@/components/panchanga/PanchangaSidebarNav";
import { cn } from "@/lib/utils";

const PanchangaShellContext = createContext(false);

export function useInPanchangaShell() {
  return useContext(PanchangaShellContext);
}

const SIDEBAR_CLASS =
  "hidden min-[992px]:sticky min-[992px]:top-20 min-[992px]:block w-56 shrink-0 self-start";

/** Persistent sidebar shell — survives client navigations between panchanga pages. */
export function PanchangaShellLayout() {
  return (
    <PanchangaShellContext.Provider value={true}>
      <main className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="flex items-start gap-6">
          <PanchangaSidebarNav className={SIDEBAR_CLASS} />
          <div className={cn("min-w-0 flex-1 overflow-x-hidden")}>
            <Outlet />
          </div>
        </div>
      </main>
    </PanchangaShellContext.Provider>
  );
}
