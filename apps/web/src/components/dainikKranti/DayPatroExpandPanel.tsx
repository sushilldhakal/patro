import type { ReactNode } from "react";
import { LayoutGrid, Sunrise } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PATRO_PLANET_KEYS,
  PATRO_PLANET_NE,
  type CalcNote,
  type GrahaSpashtaRow,
  type LagnaMatrixRow,
} from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { PatroSolarCorrectionStrip } from "@/components/dainikKranti/PatroSolarCorrectionStrip";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";

const PLANET_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu",
};

type Props = {
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
};

const LAGNA_GRID =
  "grid w-full min-w-0 grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12";

const GRAHA_GRID =
  "grid w-full min-w-0 grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4";

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn(dainikKrantiClasses.sectionHead, dainikKrantiClasses.sectionHeadText)}>
      <span className="text-secondary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </div>
  );
}

export function DayPatroExpandPanel({ lagna, graha, notes = [] }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const isEn = lang === "en";
  return (
    <div className={cn(dainikKrantiClasses.expandRoot, "space-y-4")}>
      {lagna ? (
        <div className="w-full min-w-0">
          <SectionHeading icon={<LayoutGrid />}>{t("dainik.daily_lagna_start")}</SectionHeading>
          <div className={LAGNA_GRID}>
            {getRashiList("ne").map((rne, i) => {
              const num = i + 1;
              const val = lagna.times[num];
              const late =
                val?.includes("२५") || val?.includes("२६") || val?.includes("२७");
              return (
                <div
                  key={rne}
                  className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.lagnaCell, "text-center")}
                >
                  <div className="flex justify-center">
                    <RashiGlyphIcon name={rne} number={num} size={22} />
                  </div>
                  <div className={dainikKrantiClasses.lagnaName}>
                    {bilingualText(lang, rne, getRashiList("en")[i])}
                  </div>
                  <div
                    className={cn(
                      dainikKrantiClasses.lagnaTime,
                      "break-all",
                      late ? dainikKrantiClasses.lateText : "text-foreground",
                    )}
                  >
                    {val ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {graha ? (
        <div className="w-full min-w-0 space-y-3">
          <SectionHeading icon={<Sunrise />}>{t("dainik.planetary_positions_at_sunrise")}</SectionHeading>
          <div className={GRAHA_GRID}>
            {PATRO_PLANET_KEYS.map((key) => {
              const cell = graha.planets[key];
              if (!cell) return null;
              return (
                <div
                  key={key}
                  className={cn(dainikKrantiClasses.cellBox, dainikKrantiClasses.grahaCell)}
                >
                  <div className={cn(dainikKrantiClasses.grahaNameRow, dainikKrantiClasses.grahaNameText)}>
                    <GrahaPlanetIcon graha={key as GrahaKey} size={20} />
                    {bilingualText(lang, PATRO_PLANET_NE[key], PLANET_EN[key] ?? PATRO_PLANET_NE[key])}
                    <GrahaStatusBadges
                      planetKey={key}
                      isRetrograde={cell.isRetrograde}
                      isCombust={cell.isCombust}
                      size={12}
                    />
                  </div>
                  <div className={cn(dainikKrantiClasses.grahaCoords, "break-words")}>
                    <span className={dainikKrantiClasses.grahaRashi}>{isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe}</span>{" "}
                    {cell.coords}
                  </div>
                </div>
              );
            })}
          </div>
          <PatroSolarCorrectionStrip
            deshaantar={graha.deshaantar}
            akshamsha={graha.akshamsha}
            belaantar={graha.belaantar}
          />
        </div>
      ) : null}

      {notes.length > 0 ? (
        <ul className="w-full min-w-0 space-y-1.5 text-sm">
          {notes.map((n) => (
            <li key={`${n.kind}-${n.text}`} className="break-words">
              <span className={dainikKrantiClasses.noteText}>{bilingualText(lang, n.text, n.textEn ?? n.text)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
