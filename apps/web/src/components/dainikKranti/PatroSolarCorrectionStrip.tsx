import { Clock, Globe2, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ITEMS = [
  { key: "deshaantar" as const, icon: Globe2, i18n: "aside.deshaantar" },
  { key: "akshamsha" as const, icon: Navigation, i18n: "aside.akshamsha" },
  { key: "belaantar" as const, icon: Clock, i18n: "aside.belaantar" },
] as const;

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const { t } = useTranslation();
  const values = { deshaantar, akshamsha, belaantar };
  const visible = SOLAR_ITEMS.filter((item) => values[item.key]);
  if (visible.length === 0) return null;

  return (
    <div className={cn(dainikKrantiClasses.solarStrip, className)}>
      {visible.map((item) => {
        const Icon = item.icon;
        const isBela = item.key === "belaantar";
        return (
          <div
            key={item.key}
            className={cn(
              dainikKrantiClasses.solarItem,
              isBela ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
            )}
            style={{ maxWidth: "48%" }}
          >
            <div className={cn(dainikKrantiClasses.solarLabel, dainikKrantiClasses.solarLabelText)}>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", isBela ? "text-secondary" : "text-muted-foreground")} />
              {t(item.i18n)}
            </div>
            <div
              className={cn(
                dainikKrantiClasses.solarValue,
                "break-words",
                isBela ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
              )}
            >
              {values[item.key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
