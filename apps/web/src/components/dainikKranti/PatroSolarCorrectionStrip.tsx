import { Clock, Globe2, Navigation } from "lucide-react";
import { usePatroSolarCorrection, type PatroSolarKey } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ICON: Record<PatroSolarKey, typeof Clock> = {
  deshaantar: Globe2,
  akshamsha: Navigation,
  belaantar: Clock,
};

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const items = usePatroSolarCorrection({ deshaantar, akshamsha, belaantar });
  if (items.length === 0) return null;

  return (
    <div className={cn(dainikKrantiClasses.solarStrip, className)}>
      {items.map((item) => {
        const Icon = SOLAR_ICON[item.key];
        return (
          <div
            key={item.key}
            className={cn(
              dainikKrantiClasses.solarItem,
              item.highlight ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
            )}
            style={{ maxWidth: "48%" }}
          >
            <div className={cn(dainikKrantiClasses.solarLabel, dainikKrantiClasses.solarLabelText)}>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", item.highlight ? "text-secondary" : "text-muted-foreground")} />
              {item.label}
            </div>
            <div
              className={cn(
                dainikKrantiClasses.solarValue,
                "break-words",
                item.highlight ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
              )}
            >
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
