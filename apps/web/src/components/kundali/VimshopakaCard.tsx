import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PLANET_ORDER = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

const GRADE_STYLES: Record<VimshopakaGrade, string> = {
  full: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  mediocre: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  little: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  incapable: "bg-destructive/15 text-destructive",
};

const GRADE_LABEL: Record<VimshopakaGrade, string> = {
  full: "kundali.x.grade_full",
  mediocre: "kundali.x.grade_mediocre",
  little: "kundali.x.grade_little",
  incapable: "kundali.x.grade_incapable",
};

export function VimshopakaCard({ data }: { data: VimshopakaData }) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const classes = data.classifications;

  const rows = PLANET_ORDER.map(
    (key) => data.planets.find((p) => p.key === key),
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-foreground">
          {t("kundali.vimshopaka_bala")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {bilingualText(lang, `वर्गीय बल — २० अंकको मापन (${digits(data.max_score)} पूर्ण)। ग्रहले आफ्ना फल दिने क्षमता।`, `Divisional strength on a 20-point scale (${data.max_score} = full) — a planet's capacity to deliver its results.`)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{t("kundali.graha")}</TableHead>
              {classes.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap text-center">
                  {bilingualText(lang, c.label_ne, c.label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const graha = GRAHA_NAME[p.key as GrahaKey];
              return (
                <TableRow key={p.key}>
                  <TableCell className="whitespace-nowrap font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <GrahaPlanetIcon graha={p.key as GrahaKey} size={22} />
                      {graha ? bilingualText(lang, graha.ne, graha.en) : bilingualText(lang, p.name_ne, p.name)}
                    </span>
                  </TableCell>
                  {classes.map((c) => {
                    const s = p.scores[c.key];
                    if (!s) {
                      return (
                        <TableCell key={c.key} className="text-center text-muted-foreground">
                          —
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={c.key} className="text-center">
                        <span
                          className={cn(
                            "inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-md px-2 py-0.5 font-num tabular-nums",
                            GRADE_STYLES[s.grade],
                          )}
                          title={t(GRADE_LABEL[s.grade])}
                        >
                          {digits(s.score.toFixed(2))}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Grade legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {(["full", "mediocre", "little", "incapable"] as VimshopakaGrade[]).map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", GRADE_STYLES[g])} />
            {t(GRADE_LABEL[g])}
            <span className="text-xs">
              {g === "full"
                ? "15–20"
                : g === "mediocre"
                  ? "10–15"
                  : g === "little"
                    ? "5–10"
                    : "<5"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default VimshopakaCard;
