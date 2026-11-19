import { Fragment, type ReactNode } from "react";
import { useCalculationSystem } from "@/lib/i18n";

/**
 * Rebuilds a screen's content when the reader's calculation (drik / Surya Siddhanta, or
 * drik's ayanamsha) changes. BS ↔ AD on the device reads the calculation's own month
 * table, and React Compiler keeps a computed date until its inputs change — which a switch
 * does not touch — so without this a screen kept the old calculation's days. The screen
 * stays where it is in the navigation; only what it drew is redrawn.
 */
export function CalculationRemount({ children }: { children: ReactNode }) {
  const { key } = useCalculationSystem();
  return <Fragment key={key}>{children}</Fragment>;
}
