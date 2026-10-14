import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
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
import { tFor } from "@vedic-patro/i18n/runtime";

const PLANET_ORDER = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

const v = kundaliDetailClasses.vimshopaka;

const GRADE_STYLES: Record<VimshopakaGrade, string> = {
  full: cn(v.gradeFullBg, v.gradeFullText),
  mediocre: cn(v.gradeMediocreBg, v.gradeMediocreText),
  little: cn(v.gradeLittleBg, v.gradeLittleText),
  incapable: cn(v.gradeIncapableBg, v.gradeIncapableText),
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
    <div className={v.root}>
      <div>
        <h3 className={v.title}>
          {t("kundali.vimshopaka_bala")}
        </h3>
        <p className={v.intro}>
          {bilingualText(lang, tFor(undefined, "ui.kundali.x_0d730df7", { v0: digits(data.max_score) }), `Divisional strength on a 20-point scale (${data.max_score} = full) — a planet's capacity to deliver its results.`)}
        </p>
      </div>

      <div className={v.tableWrap}>
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
                            v.badge,
                            v.badgeText,
                            "inline-flex min-w-[3.25rem] font-num",
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
      <div className={cn(v.legend, v.legendText)}>
        {(["full", "mediocre", "little", "incapable"] as VimshopakaGrade[]).map((g) => (
          <span key={g} className={cn(v.legendItem, "inline-flex")}>
            <span className={cn(v.legendDot, GRADE_STYLES[g])} />
            {t(GRADE_LABEL[g])}
            <span className={v.legendRange}>
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
