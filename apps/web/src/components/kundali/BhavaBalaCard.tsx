import { useState } from "react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import type { BhavaBalaData, BhavaBalaHouse, VargaCharts } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
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
import { cn } from "@/lib/utils";

const th = "h-9 px-2.5 text-sm font-semibold uppercase tracking-wide";
const td = "px-2.5 py-1.5 text-sm";
const num = "text-right font-mono tabular-nums";

function fmtNum(
  value: number | undefined,
  digits: (v: string | number) => string,
  places = 2,
): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(places);
  const signed = value < 0 ? `−${abs}` : abs;
  return digits(signed);
}

function GlanceTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm font-semibold uppercase tracking-wide mb-1.5">
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
    bilingualText(lang, `भाव ${digits(house)}`, `House ${house}`);

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
      <p className="text-lg font-bold text-foreground">{houseLabel(h.house)}</p>
      <p className="text-xs mt-0.5">
        {t("kundali.lord")} {lordLabel(h.lordKey as GrahaKey)}
        <span className="mx-1">·</span>
        {digits(h.percent.toFixed(1))}%
      </p>
    </>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-1">
          {t("kundali.bhava_bala_house_strength_virupas")}
        </h3>
        <p className="text-xs">
          {bilingualText(lang, `भावाधिपति (स्वामीको षड्बल) + भाव दिशा + भाव दृष्टि। समपूर्ण राशि भाव; ${digits(data.referenceVirupas)} विरुप = १००%।`, `Bhavadhipati (lord's Shadbala) + Bhava Disha + Bhava Drishti. Whole-sign houses; ${data.referenceVirupas} virupas = 100%.`)}
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

      <div className="rounded-xl border border-border overflow-x-auto">
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
