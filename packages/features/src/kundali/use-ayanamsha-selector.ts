/**
 * The kundali ayanamsha picker, shared by the website's and the app's
 * `components/kundali/AyanamshaSelector.tsx`: one chip per mode (the Nepal
 * mode starred), and the note under them naming the current mode and, when it
 * is not Lahiri, that everything — patro, months, festivals, sait, kundali — follows it.
 */
import { AYANAMSHA_MODES, getAyanamshaModeInfo, type AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export function useAyanamshaSelector({ mode, onModeChange }: { mode: AyanamshaMode; onModeChange: (mode: AyanamshaMode) => void }) {
  const { t, lang } = useLocale();
  const current = getAyanamshaModeInfo(mode);

  return {
    heading: t("kundali.ayanamsha"),
    chips: AYANAMSHA_MODES.map((m) => {
      const label = bilingualText(lang, m.labelNe, m.label);
      return {
        id: m.id,
        label: m.id === "nepal" ? `${label} ⭐` : label,
        title: bilingualText(lang, m.taglineNe, m.tagline),
        active: mode === m.id,
        select: () => onModeChange(m.id),
      };
    }),
    note: `${bilingualText(lang, current.labelNe, current.label)} — ${bilingualText(lang, current.taglineNe, current.tagline)}${
      mode === "nepal" || mode === "lahiri" ? "" : t("kundali.ayanamsha_applies_everywhere")
    }`,
  };
}
