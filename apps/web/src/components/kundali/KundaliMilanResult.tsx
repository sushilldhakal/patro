import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { AshtakutaResult, KutaRow } from "@/lib/api";
import { isEnglishLocale } from "@vedic-patro/domain/avakahada-locale";
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

const m = kundaliDetailClasses.milanResult;

const KUTA_LABELS: Record<KutaRow["id"], { en: string; ne: string }> = {
  varna: { en: "Varna", ne: "वर्ण" },
  vashya: { en: "Vashya", ne: "वश्य" },
  tara: { en: "Tara", ne: "तारा" },
  yoni: { en: "Yoni", ne: "योनि" },
  maitri: { en: "Maitri", ne: "मैत्री" },
  gana: { en: "Gana", ne: "गण" },
  bhakuta: { en: "Bhakuta", ne: "भकूट" },
  nadi: { en: "Nadi", ne: "नाडी" },
};

function formatObtained(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function KutaDetailPanel({
  kuta,
  boyName,
  girlName,
  en,
}: {
  kuta: KutaRow;
  boyName: string;
  girlName: string;
  en: boolean;
}) {
  const label = KUTA_LABELS[kuta.id];
  return (
    <div className={m.panel}>
      <p className={m.panelTitle}>
        {label ? (en ? label.en : label.ne) : kuta.id} {en ? "Kuta Details" : "कूट विवरण"}
      </p>
      <p className={m.panelPoints}>
        {en ? label?.en : label?.ne} {en ? "Kuta Points" : "कूट अङ्क"}:{" "}
        <span className={m.panelPointsValue}>
          {formatObtained(kuta.obtained)}/{kuta.max}
        </span>
      </p>
      <div className={cn(m.panelPeople, "grid sm:grid-cols-2")}>
        <div className={m.panelPerson}>
          <p className={m.panelPersonName}>{boyName}</p>
          <p className={m.panelPersonValue}>{kuta.boyValue}</p>
        </div>
        <div className={m.panelPerson}>
          <p className={m.panelPersonName}>{girlName}</p>
          <p className={m.panelPersonValue}>{kuta.girlValue}</p>
        </div>
      </div>
      <p className={m.panelInfo}>{en ? kuta.info : kuta.infoNe}</p>
    </div>
  );
}

interface Props {
  boyName: string;
  girlName: string;
  result: AshtakutaResult;
  lang?: string;
}

export function KundaliMilanResult({ boyName, girlName, result, lang }: Props) {
  const { t } = useTranslation();
  const en = isEnglishLocale(lang);
  const [openId, setOpenId] = useState<KutaRow["id"] | null>(null);

  const recClass =
    result.recommendation === "excellent"
      ? m.recExcellent
      : result.recommendation === "very_good"
        ? m.recVeryGood
        : result.recommendation === "middling"
          ? m.recMiddling
          : m.recInauspicious;

  return (
    <div className={m.root}>
      <section className={cn(m.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
        <div className={m.totalRow}>
          <div>
            <p className={m.eyebrow}>
              {t("milan.total_guna")}
            </p>
            <p className={cn(m.recommendation, recClass)}>
              {en ? result.recommendationLabel : result.recommendationLabelNe}
            </p>
          </div>
          <div className="text-right">
            <p className={m.totalValue}>
              {formatObtained(result.totalObtained)}
              <span className={m.totalMax}> / {result.totalMax}</span>
            </p>
            <p className={m.gunaLabel}>{t("milan.guna")}</p>
          </div>
        </div>
        <div className={cn(m.partners, m.partnerText)}>
          <span className={m.partner}>
            <span>{t("milan.boy")}:</span>{" "}
            <span className={m.partnerName}>{boyName}</span>
          </span>
          <span className={m.partner}>
            <span>{t("milan.girl")}:</span>{" "}
            <span className={m.partnerName}>{girlName}</span>
          </span>
        </div>
        {(result.nadiDoshaAdvisory || result.nadiDoshaAdvisoryNe) ? (
          <div
            className={cn(m.advisory, m.advisoryText)}
            role="note"
          >
            <p className={m.advisoryTitle}>
              {t("milan.nadi_dosha_advisory_title")}
            </p>
            <p>{en ? result.nadiDoshaAdvisory : result.nadiDoshaAdvisoryNe}</p>
          </div>
        ) : null}
      </section>

      <section className={m.card}>
        <h3 className={cn(m.cardTitle, "mb-4")}>{t("milan.dosha_analysis_title")}</h3>
        <ul className="divide-y divide-border/70">
          {result.doshaAnalysis.map((dosha) => (
            <li
              key={dosha.id}
              className={cn(m.doshaRow, "first:pt-0 last:pb-0")}
            >
              <span className={m.doshaLabel}>
                {en ? (
                  dosha.labelEn
                ) : (
                  <>
                    {dosha.labelNe}{" "}
                    <span className={m.doshaLabelAlt}>
                      ({dosha.labelEn.replace(" Dosha", "")})
                    </span>
                  </>
                )}
              </span>
              <span
                className={cn(
                  m.doshaVerdict,
                  dosha.present ? m.doshaPresent : m.doshaAbsent,
                )}
              >
                {dosha.present ? t("milan.dosha_present") : t("milan.dosha_absent")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={m.tableCard}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-8" />
              <TableHead>{en ? "Guna" : "गुण"}</TableHead>
              <TableHead className="text-center">{en ? "Max" : "अधिकतम"}</TableHead>
              <TableHead className="text-center">{en ? "Obt" : "प्राप्त"}</TableHead>
              <TableHead>{boyName}</TableHead>
              <TableHead>{girlName}</TableHead>
              <TableHead>{en ? "Area of Life" : "जीवन क्षेत्र"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.kutas.map((kuta) => {
              const label = KUTA_LABELS[kuta.id];
              const isOpen = openId === kuta.id;
              return (
                <Fragment key={kuta.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setOpenId(isOpen ? null : kuta.id)}
                  >
                    <TableCell className="py-2">
                      <ChevronRight
                        className={cn("size-4 transition-transform", isOpen && "rotate-90")}
                      />
                    </TableCell>
                    <TableCell className="text-base">{label ? (en ? label.en : label.ne) : kuta.id}</TableCell>
                    <TableCell className="text-center tabular-nums">{kuta.max}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">
                      {formatObtained(kuta.obtained)}
                    </TableCell>
                    <TableCell>{kuta.boyValue}</TableCell>
                    <TableCell>{kuta.girlValue}</TableCell>
                    <TableCell>
                      {en ? kuta.areaOfLife : kuta.areaOfLifeNe}
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="p-3 pt-0">
                        <KutaDetailPanel kuta={kuta} boyName={boyName} girlName={girlName} en={en} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        <p className={m.tableFootnote}>
          *{en ? "Max — Maximum Point · Obt — Obtained Point" : "अधिकतम — अधिकतम अङ्क · प्राप्त — प्राप्त अङ्क"}
        </p>
      </section>

      <section className={m.card}>
        <h3 className={cn(m.cardTitle, "mb-3")}>{t("milan.notes_title")}</h3>
        <ul className={cn("space-y-2", m.noteText, "list-disc pl-5")}>
          {(en ? result.notes : result.notesNe).map((note) => (
            <li key={note.slice(0, 40)}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
