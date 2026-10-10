import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AshtakutaResult, KutaRow } from "@/lib/api";
import { isEnglishLocale } from "@/lib/avakahada-locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-2">
        {label ? (en ? label.en : label.ne) : kuta.id} {en ? "Kuta Details" : "कूट विवरण"}
      </p>
      <p className="mb-3">
        {en ? label?.en : label?.ne} {en ? "Kuta Points" : "कूट अङ्क"}:{" "}
        <span className="font-semibold text-foreground">
          {formatObtained(kuta.obtained)}/{kuta.max}
        </span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 mb-3">
        <div className="rounded-md bg-card px-3 py-2 border border-border/60">
          <p className="text-sm uppercase tracking-wider">{boyName}</p>
          <p className="font-semibold">{kuta.boyValue}</p>
        </div>
        <div className="rounded-md bg-card px-3 py-2 border border-border/60">
          <p className="text-sm uppercase tracking-wider">{girlName}</p>
          <p className="font-semibold">{kuta.girlValue}</p>
        </div>
      </div>
      <p className="leading-relaxed">{en ? kuta.info : kuta.infoNe}</p>
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
      ? "text-emerald-600 dark:text-emerald-400"
      : result.recommendation === "very_good"
        ? "text-sky-600 dark:text-sky-400"
        : result.recommendation === "middling"
          ? "text-amber-600 dark:text-amber-400"
          : "text-destructive";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">
              {t("milan.total_guna")}
            </p>
            <p className={cn("text-2xl font-bold mt-1", recClass)}>
              {en ? result.recommendationLabel : result.recommendationLabelNe}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {formatObtained(result.totalObtained)}
              <span className="text-lg text-base"> / {result.totalMax}</span>
            </p>
            <p className="text-xs mt-0.5">{t("milan.guna")}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-border px-3 py-1">
            <span>{t("milan.boy")}:</span>{" "}
            <span className="font-semibold">{boyName}</span>
          </span>
          <span className="rounded-full border border-border px-3 py-1">
            <span>{t("milan.girl")}:</span>{" "}
            <span className="font-semibold">{girlName}</span>
          </span>
        </div>
        {(result.nadiDoshaAdvisory || result.nadiDoshaAdvisoryNe) ? (
          <div
            className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-foreground"
            role="note"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
              {t("milan.nadi_dosha_advisory_title")}
            </p>
            <p>{en ? result.nadiDoshaAdvisory : result.nadiDoshaAdvisoryNe}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("milan.dosha_analysis_title")}</h3>
        <ul className="divide-y divide-border/70">
          {result.doshaAnalysis.map((dosha) => (
            <li
              key={dosha.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-base text-foreground">
                {en ? (
                  dosha.labelEn
                ) : (
                  <>
                    {dosha.labelNe}{" "}
                    <span className="font-normal">
                      ({dosha.labelEn.replace(" Dosha", "")})
                    </span>
                  </>
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold shrink-0",
                  dosha.present
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {dosha.present ? t("milan.dosha_present") : t("milan.dosha_absent")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
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
        <p className="px-4 py-2 text-sm border-t border-border">
          *{en ? "Max — Maximum Point · Obt — Obtained Point" : "अधिकतम — अधिकतम अङ्क · प्राप्त — प्राप्त अङ्क"}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("milan.notes_title")}</h3>
        <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
          {(en ? result.notes : result.notesNe).map((note) => (
            <li key={note.slice(0, 40)}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
