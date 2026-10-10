import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import type { UpagrahaDetailRow } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-2 text-sm";

export type UpagrahaTableProps = {
  upagrahas: UpagrahaDetailRow[];
};

/**
 * Upagraha (shadow point) table: Gulika/Mandi/Kala/… plus the sun-based
 * points. Longitude DMS, nakshatra pada and lord all come from the API.
 */
export function UpagrahaTable({ upagrahas }: UpagrahaTableProps) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();

  if (upagrahas.length === 0) return null;

  const grahaName = (key: string) =>
    bilingualText(lang, GRAHA_NAME[key as GrahaKey]?.ne ?? key, GRAHA_NAME[key as GrahaKey]?.en ?? key);
  const rashiName = (rashi: number) => formatRashiByNumber(rashi, lang);

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className={cn(th, "pl-3.5")}>{t("kundali.upagraha")}</TableHead>
          <TableHead className={th}>{t("kundali.longitude")}</TableHead>
          <TableHead className={th}>{t("kundali.nakshatra_swami")}</TableHead>
          <TableHead className={cn(th, "text-right pr-3.5")}>{t("kundali.raw_l")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {upagrahas.map((row, i) => {
          const nakName = bilingualText(lang, NAKSHATRA_ICONS[row.nakshatraIndex]?.ne ?? "—", NAKSHATRA_ICONS[row.nakshatraIndex]?.en ?? "—");
          const name = bilingualText(lang, row.name_ne ?? row.name ?? row.key, row.name ?? row.key);
          return (
            <TableRow key={row.key} className={cn(i % 2 === 1 && "bg-muted/20")}>
              <TableCell className={cn(td, "pl-3.5 font-semibold text-foreground")}>
                {name}
              </TableCell>
              <TableCell className={cn(td, "font-mono tabular-nums")}>
                <span className="text-foreground font-semibold">
                  {digits(String(row.dms.deg).padStart(2, "0"))}°
                </span>{" "}
                <span className="font-sans text-foreground">{rashiName(row.dms.rashiNum)}</span>{" "}
                {digits(String(row.dms.min).padStart(2, "0"))}′{" "}
                {digits(String(row.dms.sec).padStart(2, "0"))}″
              </TableCell>
              <TableCell className={td}>
                {nakName} {digits(row.pada)}
                <span>, {grahaName(row.nakshatraLord)}</span>
              </TableCell>
              <TableCell className={cn(td, "text-right pr-3.5 font-mono tabular-nums")}>
                {digits(row.longitude.toFixed(2))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
