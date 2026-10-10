import { MoonPhaseDisc } from "@/components/tithi-mechanics/MoonPhaseDisc";
import {
  ssPhaseEn,
  ssPhaseItem,
  ssPhaseMoon,
  ssPhaseNe,
  ssPhasesList,
} from "@/lib/learn-classes";
import { useTranslation } from "react-i18next";

import { useLocale } from "@/i18n/locale";

/**
 * `roman` is the transliteration shown as a gloss under the Nepali name, so it
 * is a second key rather than a reuse of `key` — the English bundle is loaded
 * on demand and is not available while the app is in Nepali.
 */
const PHASES = [
  { key: "learn.aunsi", roman: "learn.study.phases.amavasya_roman", E: 0 },
  { key: "learn.study.phases.shukla_moon", roman: "learn.study.phases.shukla_moon_roman", E: 45 },
  { key: "learn.study.phases.first_quarter", roman: "learn.study.phases.first_quarter_roman", E: 90 },
  { key: "learn.purnima", roman: "learn.study.phases.purnima_roman", E: 180 },
  { key: "learn.study.phases.krishna_moon", roman: "learn.study.phases.krishna_moon_roman", E: 225 },
  { key: "learn.study.phases.last_quarter", roman: "learn.study.phases.last_quarter_roman", E: 270 },
  { key: "learn.study.phases.next_amavasya", roman: "learn.study.phases.next_amavasya_roman", E: 354 },
] as const;

const R = 26;

export function MoonPhasesStrip() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  return (
    <div>
      <ol className={ssPhasesList}>
        {PHASES.map((p, i) => (
          <li key={`${p.key}-${i}`} className={ssPhaseItem}>
            <svg viewBox={`0 0 ${R * 2 + 8} ${R * 2 + 8}`} className={ssPhaseMoon} aria-hidden>
              <g transform={`translate(${R + 4},${R + 4})`}>
                <MoonPhaseDisc elongation={p.E} r={R} uid={`ss-mp-${i}`} />
              </g>
            </svg>
            <span className={ssPhaseNe}>{t(p.key)}</span>
            {lang === "ne" && <span className={ssPhaseEn}>{t(p.roman)}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
