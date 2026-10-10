import { useTranslation } from "react-i18next";
import {
  PATRO_PLANET_KEYS,
  PATRO_PLANET_NE,
  type GrahaSpashtaRow,
} from "@/lib/dainikKranti/month-patro-tables";
import { getRashiList } from "@/lib/rashi-i18n";
import { cn } from "@/lib/utils";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatroTableShell } from "./PatroTableShell";
import {
  patroStickyHeadCell,
  patroStickyHeadCorner,
  patroStickyHeadRow,
  patroStickySubHeadCell,
  patroStickySubHeadCorner,
} from "@/lib/patro-classes";

const th = "whitespace-nowrap px-2 py-2.5 text-sm font-semibold";
const td = "whitespace-nowrap px-2 py-2 text-sm";

const PLANET_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu",
};

type Props = {
  rows: GrahaSpashtaRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  embedded?: boolean;
};

function formatPlanetCell(cell: { rashiNe: string; rashiEn?: string; coords: string } | undefined, isEn: boolean): string {
  if (!cell) return "—";
  return `${isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe} ${cell.coords}`;
}

export function MonthGrahaSpashta({ rows, todayKey, loading, empty, embedded }: Props) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const isEn = lang === "en";
  const table = (
      <Table>
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{t("dainik.date")}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "text-left")}>{t("dainik.day")}</TableHead>
            {PATRO_PLANET_KEYS.map((key) => (
              <TableHead key={key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] text-center")}>
                {bilingualText(lang, PATRO_PLANET_NE[key], PLANET_EN[key] ?? PATRO_PLANET_NE[key])}
              </TableHead>
            ))}
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>
              {t("aside.deshaantar")}
            </TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>
              {t("aside.akshamsha")}
            </TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] text-center")}>{t("dainik.belaantar")}</TableHead>
          </TableRow>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead colSpan={2} className={patroStickySubHeadCorner} />
            {PATRO_PLANET_KEYS.map((key) => (
              <TableHead key={`sub-${key}`} className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>
                {t("dainik.ra_deg_ka_vi")}
              </TableHead>
            ))}
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>
              {t("aside.deshaantar")}
            </TableHead>
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>
              {t("aside.akshamsha")}
            </TableHead>
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{t("dainik.time_corr")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={13} className="py-8 text-center text-sm">
                {t("dainik.loading")}
              </TableCell>
            </TableRow>
          ) : empty || rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="py-8 text-center text-sm">
                {t("dainik.no_days_found_in_this_paksha")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const isToday = row.dateAd === todayKey;
              const hasPlanets = PATRO_PLANET_KEYS.some((k) => row.planets[k]);
              return (
                <TableRow
                  key={row.dateAd}
                  className={cn(isToday && "bg-secondary/15 hover:bg-secondary/20")}
                >
                  <TableCell
                    className={cn(
                      td,
                      "sticky left-0 z-10 bg-card pl-3 font-semibold",
                      isToday && "bg-secondary/15",
                    )}
                  >
                    {digits(row.day)}
                  </TableCell>
                  <TableCell className={cn(td, "")}>
                    {bilingualText(lang, row.weekdayNe ?? "—", row.weekdayEn ?? row.weekdayNe ?? "—")}
                  </TableCell>
                  {PATRO_PLANET_KEYS.map((key) => {
                    const cell = row.planets[key];
                    return (
                      <TableCell
                        key={key}
                        className={cn(td, "text-center font-mono tabular-nums")}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          {formatPlanetCell(cell, isEn)}
                          <GrahaStatusBadges
                            planetKey={key}
                            isRetrograde={cell?.isRetrograde}
                            isCombust={cell?.isCombust}
                            size={12}
                          />
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className={cn(td, "text-center font-mono tabular-nums")}>
                    {row.deshaantar ?? "—"}
                  </TableCell>
                  <TableCell className={cn(td, "text-center font-mono tabular-nums")}>
                    {row.akshamsha ?? "—"}
                  </TableCell>
                  <TableCell className={cn(td, "text-center font-mono tabular-nums")}>
                    {row.belaantar ?? (hasPlanets ? "—" : "—")}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
  );

  const footnote = (
    <p className="border-t border-border px-4 py-2 text-sm leading-relaxed">
      {bilingualNode(lang, 
        <>
          राशिहरू: {getRashiList("ne").join(", ")}। प्रत्येक ग्रहको कोष्ठकमा{" "}
          <span className="font-mono">राशि अंश|कला|विकला</span> — जस्तै{" "}
          <span className="font-mono text-foreground">वृष १३|६|२९</span> = वृष राशि, १३ अंश ६ कला २९ विकला।
        </>,
        <>
          Signs: {getRashiList("en").join(", ")}. Each planet's bracket shows{" "}
          <span className="font-mono">sign deg|kala|vikala</span> — e.g.{" "}
          <span className="font-mono text-foreground">Vrishabha 13|6|29</span> = Vrishabha sign, 13 deg 6 kala 29 vikala.
        </>,
      )}
    </p>
  );

  if (embedded) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        {table}
        {footnote}
      </div>
    );
  }

  return (
    <PatroTableShell
      titleNe="उदयकालिक सूर्यादिग्रहस्पष्ट"
      titleEn="Sunrise Planetary Positions (Graha Spashta)"
      subtitle="सूर्योदयको क्षणमा ग्रहहरूको राश्यादि स्थिति (राशि, अंश|कला|विकला), देशान्तर, अक्षांश र दैनिक बेलान्तर।"
      subtitleEn="Planetary rashi at sunrise (sign, deg|kala|vikala), plus deshaantar, akshamsha, and daily belaantar."
    >
      {table}
      {footnote}
    </PatroTableShell>
  );
}
