import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "@vedic-patro/i18n/react";
import type {
  AshtakavargaData,
  AshtakavargaSignRow,
  ShodhyaPindaRow,
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { grahaName } from "@/lib/graha-i18n";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

/** Matrix column order + labels (display only — scores come from the API). */
const ASHTAKAVARGA_TARGETS = [
  "lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
] as const;

const th = "h-auto py-2 px-2 text-sm font-semibold tracking-wide whitespace-nowrap";
const thGraha = cn(th, "text-right min-w-[4.75rem] normal-case align-bottom");
const av = kundaliDetailClasses.ashtakavarga;
const td = av.td;
const num = av.num;

function ashtakavargaTargetLabel(
  target: (typeof ASHTAKAVARGA_TARGETS)[number],
  lang: "ne" | "en",
) {
  return grahaName(target, lang);
}

function AshtakavargaTargetHead({
  target,
}: {
  target: (typeof ASHTAKAVARGA_TARGETS)[number];
}) {
  const { lang } = useLocale();
  const label = ashtakavargaTargetLabel(target, lang);
  if (target !== "lagna") {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <GrahaPlanetIcon graha={target as GrahaKey} size={18} />
        <span className={av.targetLabel}>{label}</span>
      </span>
    );
  }
  return <span className={av.targetLabel}>{label}</span>;
}

function AshtakavargaMatrix({
  title,
  rows,
  showSarvashtaka = true,
}: {
  title: string;
  rows: AshtakavargaSignRow[];
  showSarvashtaka?: boolean;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();

  return (
    <div>
      <h4 className={av.blockTitle}>{title}</h4>
      <div className={av.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3 min-w-[5.5rem] uppercase")}>
                {t("kundali.rashi")}
              </TableHead>
              {ASHTAKAVARGA_TARGETS.map((t) => (
                <TableHead key={t} className={thGraha}>
                  <AshtakavargaTargetHead target={t} />
                </TableHead>
              ))}
              {showSarvashtaka && (
                <TableHead className={cn(th, "text-right min-w-[3rem] uppercase")}>
                  {t("kundali.sarv")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.rashi}>
                <TableCell className={cn(td, "sticky left-0 z-10 bg-card pl-3 font-semibold text-foreground")}>
                  <span className="inline-flex items-center gap-2">
                    <RashiGlyphIcon name={row.rashiNe} number={row.rashi} size={22} />
                    {bilingualText(lang, row.rashiNe, row.rashiEn)}
                  </span>
                </TableCell>
                {ASHTAKAVARGA_TARGETS.map((t) => (
                  <TableCell key={t} className={cn(td, num)}>
                    {digits(row.bindus[t])}
                  </TableCell>
                ))}
                {showSarvashtaka && (
                  <TableCell className={cn(td, num, "font-semibold")}>
                    {digits(row.sarvashtaka)}
                  </TableCell>
                )}
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className={cn(td, "sticky left-0 z-10 bg-muted/30 pl-3")}>
                {t("kundali.sarvashtaka")}
              </TableCell>
              {ASHTAKAVARGA_TARGETS.map((t) => (
                <TableCell key={t} className={cn(td, num)}>
                  {digits(rows.reduce((s, r) => s + r.bindus[t], 0))}
                </TableCell>
              ))}
              {showSarvashtaka && (
                <TableCell className={cn(td, num)}>
                  {digits(rows.reduce((s, r) => s + r.sarvashtaka, 0))}
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ShodhyaPindaTable({ rows }: { rows: ShodhyaPindaRow[] }) {
  const { t } = useTranslation();
  const { digits } = useLocale();

  const metricRows: {
    key: keyof Pick<ShodhyaPindaRow, "rashiPinda" | "grahaPinda" | "shodhyaPinda">;
    label: string;
  }[] = [
    { key: "rashiPinda", label: "kundali.rashi" },
    { key: "grahaPinda", label: "kundali.graha" },
    { key: "shodhyaPinda", label: "kundali.x.pinda_shodhya" },
  ];

  return (
    <div>
      <h4 className={av.blockTitle}>
        {t("kundali.shodhya_pinda")}
      </h4>
      <div className={av.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "sticky left-0 z-10 bg-muted pl-3")} />
              {ASHTAKAVARGA_TARGETS.map((t) => (
                <TableHead key={t} className={thGraha}>
                  <AshtakavargaTargetHead target={t} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricRows.map((metric) => (
              <TableRow
                key={metric.key}
                className={metric.key === "shodhyaPinda" ? "bg-muted/20 font-semibold" : undefined}
              >
                <TableCell className={cn(td, "sticky left-0 z-10 bg-card pl-3 font-semibold")}>
                  {t(metric.label)}
                </TableCell>
                {ASHTAKAVARGA_TARGETS.map((t) => {
                  const row = rows.find((r) => r.target === t);
                  const val = row?.[metric.key];
                  return (
                    <TableCell key={t} className={cn(td, num)}>
                      {val != null ? digits(val) : "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AshtakavargaCard({ data }: { data: AshtakavargaData }) {
  const { t } = useTranslation();

  return (
    <div className={av.root}>
      <div>
        <h3 className={av.heading}>
          {t("kundali.ashtakavarga")}
        </h3>
        <p className={av.intro}>
          {t("kundali.parashari_bindu_tables_per_rashi_sarv_sums_the_seven_gr")}
        </p>
      </div>

      <AshtakavargaMatrix
        title={t("kundali.ashtakavarga")}
        rows={data.raw}
      />

      <AshtakavargaMatrix
        title={t("kundali.reduced_ashtakavarga")}
        rows={data.reduced}
      />

      <ShodhyaPindaTable rows={data.shodhyaPinda} />
    </div>
  );
}
