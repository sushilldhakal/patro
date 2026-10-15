import { Check, Info } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale, bilingualText } from "@/i18n/locale";
import type { KundaliYoga } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const th = kundaliDetailClasses.table.th;
const td = kundaliDetailClasses.table.td;

export type YogaListProps = {
  yogas: KundaliYoga[];
};

/**
 * Kundali yoga checklist: each classical yoga with its nature
 * (auspicious / inauspicious), whether it is formed in this chart, and an
 * ⓘ description of the rule used.
 */
export function YogaList({ yogas }: YogaListProps) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const present = yogas.filter((y) => y.present);

  if (present.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className={cn(th, "pl-3.5")}>{t("kundali.yoga")}</TableHead>
          <TableHead className={th}>{t("kundali.nature")}</TableHead>
          <TableHead className={cn(th, "pr-3.5")}>{t("kundali.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {present.map((yoga, i) => {
          const desc = bilingualText(lang, yoga.descNe?.trim() ? yoga.descNe : yoga.descEn, yoga.descEn);
          const name = bilingualText(lang, yoga.nameNe?.trim() ? yoga.nameNe : yoga.nameEn, yoga.nameEn);
          return (
            <TableRow
              key={yoga.key}
              className={cn(
                i % 2 === 1 && "bg-muted/20",
                "bg-secondary/[0.06] dark:bg-secondary/10",
              )}
            >
              <TableCell
                className={cn(
                  td,
                  "pl-3.5 min-w-[11rem] max-w-[min(100%,28rem)] whitespace-normal align-top",
                )}
              >
                <span className={cn("flex", kundaliDetailClasses.parts.yogaName)}>
                  <Info
                    className="size-3.5 shrink-0"
                    aria-hidden
                  />
                  {name}
                </span>
                <span className={cn("block break-words", kundaliDetailClasses.parts.yogaDesc)}>
                  {desc}
                </span>
              </TableCell>
              <TableCell className={cn(td, "whitespace-nowrap align-top")}>
                <span
                  className={cn(
                    "inline-flex",
                    kundaliDetailClasses.parts.natureBadge,
                    yoga.nature === "auspicious"
                      ? "bg-secondary/15 text-secondary"
                      : yoga.nature === "mixed"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : yoga.nature === "caution"
                          ? "bg-muted"
                          : "bg-destructive/10 text-destructive",
                  )}
                >
                  {yoga.nature === "auspicious"
                    ? t("kundali.auspicious")
                    : yoga.nature === "mixed"
                      ? t("kundali.mixed")
                      : yoga.nature === "caution"
                        ? t("kundali.caution")
                        : t("kundali.inauspicious")}
                </span>
              </TableCell>
              <TableCell className={cn(td, "pr-3.5 whitespace-nowrap align-top")}>
                <span className={cn("inline-flex", kundaliDetailClasses.parts.presentLabel)}>
                  <Check className="size-3.5 text-secondary" aria-hidden />
                  {t("kundali.present")}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
