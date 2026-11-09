import { useCalculationSystem, useTranslation } from "@vedic-patro/i18n/react";
import { CALCULATION_SYSTEMS, type CalculationSystem } from "@vedic-patro/domain/calendar/calculation-system";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const c = kundaliDetailClasses.ayanamsha;

const LABEL: Record<CalculationSystem, string> = {
  drik: "calculation_system.drik",
  surya_siddhanta: "calculation_system.surya_siddhanta",
};
const HINT: Record<CalculationSystem, string> = {
  drik: "calculation_system.drik_hint",
  surya_siddhanta: "calculation_system.surya_siddhanta_hint",
};

/**
 * Drik or the Surya Siddhanta for the panchanga, calendar, festivals and kundali.
 * Matches the mobile app: one choice drives every computed date.
 */
export function CalculationSystemSelector() {
  const { t } = useTranslation();
  const { system, setSystem } = useCalculationSystem();
  return (
    <section className={cn(c.card, "w-full overflow-hidden border border-border")}>
      <div className={cn(c.header, "bg-secondary/[0.09] dark:bg-secondary/20")}>
        <span className={c.heading}>{t("calculation_system.label")}</span>
      </div>
      <div className={c.body}>
        <div className={c.chips} role="radiogroup" aria-label={t("calculation_system.label")}>
          {CALCULATION_SYSTEMS.map((id) => {
            const active = system === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                title={t(HINT[id])}
                onClick={() => setSystem(id)}
                className={cn(
                  c.chip,
                  c.chipText,
                  "inline-flex items-center transition-colors",
                  active ? cn(c.chipActive, c.chipActiveText) : cn(c.chipIdle, c.chipIdleText, "hover:bg-muted"),
                )}
              >
                {t(LABEL[id])}
              </button>
            );
          })}
        </div>
        <p className={c.note}>
          {t(HINT[system])}
          {system === "surya_siddhanta" ? ` — ${t("calculation_system.kundali_note")}` : ""}
        </p>
      </div>
    </section>
  );
}
