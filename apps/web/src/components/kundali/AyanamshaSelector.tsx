import { useTranslation } from "@vedic-patro/i18n/react";
import {
  AYANAMSHA_MODES,
  getAyanamshaModeInfo,
  matchesPanchangaAngas,
  type AyanamshaMode,
} from "@vedic-patro/domain/ayanamsha";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

interface Props {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
}

export function AyanamshaSelector({ mode, onModeChange }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const current = getAyanamshaModeInfo(mode);

  return (
    <div className={cn(kundaliDetailClasses.ayanamsha.card, "w-full overflow-hidden shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
      <div className={cn(kundaliDetailClasses.ayanamsha.header, "flex flex-wrap items-baseline gap-x-2.5 gap-y-1 bg-secondary/[0.09] dark:bg-secondary/20")}>
        <span className={kundaliDetailClasses.ayanamsha.heading}>
          {t("kundali.ayanamsha")}
        </span>
      </div>

      <div className={kundaliDetailClasses.ayanamsha.body}>
        <div className={kundaliDetailClasses.ayanamsha.chips}>
          {AYANAMSHA_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={bilingualText(lang, m.taglineNe, m.tagline)}
              onClick={() => onModeChange(m.id)}
              className={cn(
                kundaliDetailClasses.ayanamsha.chip,
                kundaliDetailClasses.ayanamsha.chipText,
                "inline-flex items-center transition-colors",
                mode === m.id
                  ? cn(kundaliDetailClasses.ayanamsha.chipActive, kundaliDetailClasses.ayanamsha.chipActiveText)
                  : cn(kundaliDetailClasses.ayanamsha.chipIdle, kundaliDetailClasses.ayanamsha.chipIdleText, "hover:bg-muted")
              )}
            >
              {m.id === "nepal" ? `${bilingualText(lang, m.labelNe, m.label)} ⭐` : bilingualText(lang, m.labelNe, m.label)}
            </button>
          ))}
        </div>

        <p className={kundaliDetailClasses.ayanamsha.note}>
          {bilingualText(lang, current.labelNe, current.label)} — {bilingualText(lang, current.taglineNe, current.tagline)}
          {!matchesPanchangaAngas(mode) &&
            t("kundali.grahas_lagna_and_nakshatra_are_computed_in_this_ayanams")}
        </p>
      </div>
    </div>
  );
}
