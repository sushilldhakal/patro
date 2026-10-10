import { useTranslation } from "react-i18next";
import {
  AYANAMSHA_MODES,
  getAyanamshaModeInfo,
  matchesPanchangaAngas,
  type AyanamshaMode,
} from "@vedic-patro/domain/ayanamsha";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText } from "@/i18n/locale";

interface Props {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
}

export function AyanamshaSelector({ mode, onModeChange }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const current = getAyanamshaModeInfo(mode);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3.5 py-2.5 border-b border-border bg-secondary/[0.09] dark:bg-secondary/20">
        <span className="text-sm font-semibold uppercase tracking-wider">
          {t("kundali.ayanamsha")}
        </span>
      </div>

      <div className="px-3.5 py-3 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {AYANAMSHA_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={bilingualText(lang, m.taglineNe, m.tagline)}
              onClick={() => onModeChange(m.id)}
              className={cn(
                "h-8 px-3 rounded-lg border text-sm text-base transition-colors",
                mode === m.id
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-background/40 dark:bg-background/20 text-foreground hover:bg-muted"
              )}
            >
              {m.id === "nepal" ? `${bilingualText(lang, m.labelNe, m.label)} ⭐` : bilingualText(lang, m.labelNe, m.label)}
            </button>
          ))}
        </div>

        <p className="text-sm leading-snug">
          {bilingualText(lang, current.labelNe, current.label)} — {bilingualText(lang, current.taglineNe, current.tagline)}
          {!matchesPanchangaAngas(mode) &&
            t("kundali.grahas_lagna_and_nakshatra_are_computed_in_this_ayanams")}
        </p>
      </div>
    </div>
  );
}
