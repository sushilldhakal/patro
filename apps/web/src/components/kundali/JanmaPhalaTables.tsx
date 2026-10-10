import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import {
  PURUSHA_JANMA_GRAHAS,
  PURUSHA_JANMA_ROWS,
  STREI_JANMA_GRAHAS,
  STREI_JANMA_ROWS,
  buildJanmaPhalaHintParts,
  splitJanmaPhala,
  type JanmaPhalaGrahaCol,
  type JanmaPhalaRow,
} from "@vedic-patro/domain/janma-phala-tables";
import { JanmaPhalaChartSummary } from "@/components/kundali/JanmaPhalaChartSummary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { Button } from "@/components/ui/button";

const th =
  "h-auto min-h-9 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide align-bottom whitespace-normal";
const td = "px-2 py-2 text-xs align-top whitespace-normal leading-snug";
const houseTd =
  "px-2.5 py-2 text-sm font-semibold align-top whitespace-nowrap sticky left-0 z-[1] bg-muted/80 backdrop-blur-sm";

type TabId = "male" | "female";

function PhalaCell({ text }: { text: string }) {
  const [a, b] = splitJanmaPhala(text);
  return (
    <span className="block text-[0.8125rem] leading-snug text-foreground">
      {a}
      {b ? (
        <>
          <span className="text-muted-foreground"> · </span>
          {b}
        </>
      ) : null}
    </span>
  );
}

function JanmaPhalaTable({
  rows,
  grahas,
  houseColLabel,
  chartBhavas,
}: {
  rows: JanmaPhalaRow[];
  grahas: JanmaPhalaGrahaCol[];
  houseColLabel: string;
  chartBhavas?: Partial<Record<string, number>>;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className={cn(th, "pl-3.5 min-w-[5.5rem] sticky left-0 z-[2] bg-muted/90")}>
              {houseColLabel}
            </TableHead>
            {grahas.map((g) => (
              <TableHead key={g.id} className={cn(th, "min-w-[7rem] max-w-[9rem] text-center")}>
                {t(g.labelKey)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => {
            const houseNum = rowIdx + 1;
            return (
              <TableRow key={row.houseKey}>
                <TableCell className={cn(houseTd, "pl-3.5 border-r border-border")}>
                  {t(row.houseKey)}
                </TableCell>
                {row.phala.map((cell, i) => {
                  const grahaId = grahas[i]?.id;
                  const houseForGraha = (id: string) => chartBhavas?.[id];
                  const isChartCell =
                    grahaId != null &&
                    (grahaId === "rahuKetu"
                      ? houseForGraha("rahu") === houseNum || houseForGraha("ketu") === houseNum
                      : houseForGraha(grahaId) === houseNum);
                  return (
                    <TableCell
                      key={`${row.houseKey}-${i}`}
                      className={cn(
                        td,
                        isChartCell && "bg-secondary/15 ring-1 ring-inset ring-secondary/40",
                      )}
                    >
                      <PhalaCell text={cell} />
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function JanmaPhalaTables({
  tab,
  onTabChange,
  chartBhavas,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  /** D1 lagna-anchored bhavas for sun/moon/mars — highlights matching table cells. */
  chartBhavas?: Partial<Record<string, number>>;
}) {
  const { t } = useTranslation();
  const { digits } = useLocale();

  const hintParts = buildJanmaPhalaHintParts(chartBhavas ?? {}, tab, t, digits);

  return (
    <div className="mt-10 space-y-4 border-t border-border pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            {t("kundali.janma_phala_title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-3xl">
            {tab === "male"
              ? t("kundali.janma_phala_purusha_intro")
              : t("kundali.janma_phala_stree_intro")}
          </p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-border bg-muted/30 p-0.5"
          role="tablist"
          aria-label={t("kundali.janma_phala_tabs_aria")}
        >
          <Button
            type="button"
            role="tab"
            variant="ghost"
            size="sm"
            aria-selected={tab === "male"}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-semibold",
              tab === "male" && "bg-card shadow-sm text-secondary",
            )}
            onClick={() => onTabChange("male")}
          >
            {t("kundali.janma_phala_tab_male")}
          </Button>
          <Button
            type="button"
            role="tab"
            variant="ghost"
            size="sm"
            aria-selected={tab === "female"}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-semibold",
              tab === "female" && "bg-card shadow-sm text-secondary",
            )}
            onClick={() => onTabChange("female")}
          >
            {t("kundali.janma_phala_tab_female")}
          </Button>
        </div>
      </div>

      {hintParts.length > 0 ? (
        <JanmaPhalaChartSummary parts={hintParts} />
      ) : null}

      <p className="text-xs font-medium text-muted-foreground">
        {tab === "male"
          ? t("kundali.x.purusha_janma_phala_caption")
          : t("kundali.x.stree_janma_phala_caption")}
      </p>

      {tab === "male" ? (
        <JanmaPhalaTable
          rows={PURUSHA_JANMA_ROWS}
          grahas={PURUSHA_JANMA_GRAHAS}
          houseColLabel={t("kundali.bhava_19")}
          chartBhavas={chartBhavas}
        />
      ) : (
        <JanmaPhalaTable
          rows={STREI_JANMA_ROWS}
          grahas={STREI_JANMA_GRAHAS}
          houseColLabel={t("kundali.bhava_19")}
          chartBhavas={chartBhavas}
        />
      )}
    </div>
  );
}
