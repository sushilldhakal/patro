import { useState } from "react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { BhavaBalaData, BhavaBalaHouse, VargaCharts } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { BhavaBalaChart } from "@/components/kundali/BhavaBalaChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { fmtNum } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-1.5 text-sm";
const num = "text-right font-mono tabular-nums";

function GlanceTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={kundaliDetailClasses.glance.card}>
      <p className={kundaliDetailClasses.glance.label}>
        {label}
      </p>
      {children}
    </div>
  );
}

export function BhavaBalaCard({
  data,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const [selectedHouse, setSelectedHouse] = useState(data.strongest.house);

  return (
    <div className="space-y-6">
      <BhavaBalaChart
        data={data}
        selectedHouse={selectedHouse}
        onSelectHouse={setSelectedHouse}
        vargaCharts={vargaCharts}
        combustion={combustion}
      />
      <BhavaBalaTable data={data} selectedHouse={selectedHouse} onSelectHouse={setSelectedHouse} />
    </div>
  );
}

export function BhavaBalaTable({
  data,
  selectedHouse,
  onSelectHouse,
}: {
  data: BhavaBalaData;
  selectedHouse?: number;
  onSelectHouse?: (house: number) => void;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();

  const houseLabel = (house: number) =>
    bilingualText(lang, tFor(undefined, "ui.kundali.x_f08204a5", { v0: digits(house) }), `House ${house}`);

  const lordLabel = (key: GrahaKey) =>
    bilingualText(lang, GRAHA_NAME[key].ne, GRAHA_NAME[key].en);

  const lordCell = (key: string) => {
    const graha = key as GrahaKey;
    return (
      <span className="inline-flex items-center justify-end gap-1.5">
        <GrahaPlanetIcon graha={graha} size={20} />
        {lordLabel(graha)}
      </span>
    );
  };

  const houseSummary = (h: BhavaBalaHouse) => (
    <>
      <p className={kundaliDetailClasses.glance.name}>{houseLabel(h.house)}</p>
      <p className={kundaliDetailClasses.glance.subTight}>
        {t("kundali.lord")} {lordLabel(h.lordKey as GrahaKey)}
        <span className="mx-1">·</span>
        {digits(h.percent.toFixed(1))}%
      </p>
    </>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className={kundaliDetailClasses.glance.heading}>
          {t("kundali.bhava_bala_house_strength_virupas")}
        </h3>
        <p className={kundaliDetailClasses.glance.intro}>
          {bilingualText(lang, tFor(undefined, "ui.kundali.x_cf46d965", { v0: digits(data.referenceVirupas) }), `Bhavadhipati (lord's Shadbala) + Bhava Disha + Bhava Drishti. Whole-sign houses; ${data.referenceVirupas} virupas = 100%.`)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlanceTile label={t("kundali.strongest_house")}>
          {houseSummary(data.strongest)}
        </GlanceTile>
        <GlanceTile label={t("kundali.weakest_house")}>
          {houseSummary(data.weakest)}
        </GlanceTile>
      </div>

      <div className={kundaliDetailClasses.glance.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "pl-3.5")}>{t("kundali.house")}</TableHead>
              <TableHead className={cn(th, "text-right")}>{t("kundali.lord")}</TableHead>
              <TableHead className={cn(th, "text-right")}>
                {t("kundali.bhavadhipati")}
              </TableHead>
              <TableHead className={cn(th, "text-right")}>{t("kundali.disha")}</TableHead>
              <TableHead className={cn(th, "text-right")}>{t("kundali.drishti")}</TableHead>
              <TableHead className={cn(th, "text-right")}>
                {t("kundali.total_pinda")}
              </TableHead>
              <TableHead className={cn(th, "text-right")}>
                {t("kundali.bhava")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.houses.map((h) => {
              const selected = selectedHouse === h.house;
              return (
                <TableRow
                  key={h.house}
                  data-state={selected ? "selected" : undefined}
                  className={cn(onSelectHouse && "cursor-pointer", selected && "bg-primary/10")}
                  onClick={onSelectHouse ? () => onSelectHouse(h.house) : undefined}
                >
                  <TableCell className={cn(td, "font-semibold pl-3.5")}>
                    {houseLabel(h.house)}
                  </TableCell>
                  <TableCell className={cn(td, "text-right")}>{lordCell(h.lordKey)}</TableCell>
                  <TableCell className={cn(td, num)}>{fmtNum(h.bhavadhipati, digits)}</TableCell>
                  <TableCell className={cn(td, num)}>{fmtNum(h.disha, digits)}</TableCell>
                  <TableCell className={cn(td, num)}>{fmtNum(h.drishti, digits)}</TableCell>
                  <TableCell className={cn(td, num, "font-semibold")}>
                    {fmtNum(h.totalPinda, digits)}
                  </TableCell>
                  <TableCell className={cn(td, num, "font-semibold")}>
                    {digits(h.percent.toFixed(1))}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
