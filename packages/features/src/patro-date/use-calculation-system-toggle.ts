/**
 * Drik | Surya Siddhanta, shared by the website and the app: the label, the two
 * options (always Drik first, so they never swap places when pressed), their
 * hints and which one is on. Each app draws its own widget on top of this.
 */
import type { CalculationSystem } from "@vedic-patro/domain/calendar/calculation-system";
import { useCalculationSystem, useLocale } from "@vedic-patro/i18n/react";

export type CalculationSystemOption = {
  system: CalculationSystem;
  label: string;
  hint: string;
  active: boolean;
};

export function useCalculationSystemToggle(): {
  label: string;
  ariaLabel: string;
  options: CalculationSystemOption[];
  select: (s: CalculationSystem) => void;
} {
  const { t } = useLocale();
  const { system, setSystem } = useCalculationSystem();
  return {
    label: t("calculation_system.label"),
    ariaLabel: t("calculation_system.switch_aria"),
    options: [
      { system: "drik", label: t("calculation_system.drik_short"), hint: t("calculation_system.drik_hint"), active: system === "drik" },
      {
        system: "surya_siddhanta",
        label: t("calculation_system.surya_siddhanta"),
        hint: t("calculation_system.surya_siddhanta_hint"),
        active: system === "surya_siddhanta",
      },
    ],
    select: (s) => setSystem(s),
  };
}
