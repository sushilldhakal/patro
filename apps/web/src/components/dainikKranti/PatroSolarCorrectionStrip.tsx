import { Clock, Globe2, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
    <div className={cn("flex w-full min-w-0 flex-wrap gap-2", className)}>
      {visible.map((item) => {
        const Icon = item.icon;
        const isBela = item.key === "belaantar";
        return (
          <div
            key={item.key}
            className={cn(
              "min-w-[8rem] flex-1 rounded-md border px-2.5 py-2",
              isBela ? "border-amber-500/30 bg-amber-500/5" : "border-border/80 bg-background/80",
            )}
            style={{ maxWidth: "48%" }}
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", isBela ? "text-secondary" : "text-muted-foreground")} />
              {t(item.i18n)}
            </div>
            <div
              className={cn(
                "mt-1 break-words font-mono text-xs tabular-nums sm:text-sm",
                isBela ? "text-amber-800 dark:text-amber-200" : "text-foreground",
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
