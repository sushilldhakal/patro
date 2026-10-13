import { useMemo } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { CalcNote } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { PatroTableShell } from "./PatroTableShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import {
  patroStickyHeadCell,
  patroStickyHeadRow,
} from "@/lib/patro-classes";

const UDAYAST_LEGEND: { code: string; full: string; fullEn: string; meaning: string; meaningEn: string }[] = [
  { code: "व.उ.", full: "वक्र उदय", fullEn: "Retrograde rising", meaning: "ग्रह वक्र (उल्टो) अवस्थामा उदय भएको।", meaningEn: "The planet rises while retrograde (moving backward)." },
  { code: "बु.मा.उ.", full: "बुध मार्गी उदय", fullEn: "Mercury direct rising", meaning: "बुध मार्गी (सुल्टो) भएर उदय भएको।", meaningEn: "Mercury rises while direct." },
  { code: "वृ.व.उ.", full: "बृहस्पति वक्र उदय", fullEn: "Jupiter retrograde rising", meaning: "बृहस्पति (गुरु) वक्र अवस्थामा उदय भएको।", meaningEn: "Jupiter rises while retrograde." },
  { code: "शु.मा.उ.", full: "शुक्र मार्गी उदय", fullEn: "Venus direct rising", meaning: "शुक्र मार्गी भएर उदय भएको।", meaningEn: "Venus rises while direct." },
  { code: "श.मा.उ. ७अ.", full: "शनि मार्गी उदय, ७ अस्त", fullEn: "Saturn direct rising, sets on the 7th", meaning: "शनि मार्गी भएर उदय भएको र ७ गते अस्त हुने।", meaningEn: "Saturn rises while direct and sets on the 7th." },
];

const KIND_LABEL: Record<CalcNote["kind"], string> = {
  ingress: "ग्रहचार",
  udayast: "उदयास्त",
  motion: "वक्री/मार्गी",
  late_night: "रात्रिकालीन",
  paksha_boundary: "पक्ष सीमा",
};

const KIND_LABEL_EN: Record<CalcNote["kind"], string> = {
  ingress: "Transit",
  udayast: "Rise/Set",
  motion: "Retro/Direct",
  late_night: "Late night",
  paksha_boundary: "Paksha boundary",
};

const KIND_ORDER: Record<CalcNote["kind"], number> = {
  paksha_boundary: 0,
  late_night: 1,
  ingress: 2,
  udayast: 3,
  motion: 4,
};

type DayGroup = {
  day: number;
  dateAd: string;
  notes: CalcNote[];
};

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind }: { kind: CalcNote["kind"] }) {
  const { lang } = useLocale();
  return (
    <span
      className={cn(
        dainikKrantiClasses.kindBadge,
        dainikKrantiClasses.kindBadgeText,
        kind === "late_night" && cn(dainikKrantiClasses.kindLate, dainikKrantiClasses.kindLateText),
        kind === "ingress" && cn(dainikKrantiClasses.kindIngress, dainikKrantiClasses.kindIngressText),
        kind === "paksha_boundary" && dainikKrantiClasses.kindPaksha,
        kind === "udayast" && cn(dainikKrantiClasses.kindUdayast, dainikKrantiClasses.kindUdayastText),
        kind === "motion" && cn(dainikKrantiClasses.kindMotion, dainikKrantiClasses.kindMotionText),
      )}
    >
      {bilingualText(lang, KIND_LABEL[kind], KIND_LABEL_EN[kind])}
    </span>
  );
}

const th = cn(dainikKrantiClasses.calcTh, "h-9 whitespace-nowrap");
const td = cn(dainikKrantiClasses.calcTd, "align-top");

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();

  const groups = useMemo(() => {
    const byDate = new Map<string, DayGroup>();
    for (const note of notes) {
      const existing = byDate.get(note.dateAd);
      if (existing) {
        existing.notes.push(note);
      } else {
        byDate.set(note.dateAd, {
          day: note.day,
          dateAd: note.dateAd,
          notes: [note],
        });
      }
    }
    return [...byDate.values()]
      .sort((a, b) => a.day - b.day || a.dateAd.localeCompare(b.dateAd))
      .map((group) => ({
        ...group,
        notes: [...group.notes].sort(
          (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.text.localeCompare(b.text),
        ),
      }));
  }, [notes]);

  const notesTable = loading ? (
    <p className={dainikKrantiClasses.calcEmpty}>{t("dainik.loading")}</p>
  ) : groups.length === 0 ? (
    <p className={dainikKrantiClasses.calcEmpty}>
      {t("dainik.no_special_calculation_notes_this_month")}
    </p>
  ) : (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[28rem] text-sm">
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCell, "w-14")}>
              {t("dainik.date")}
            </TableHead>
            <TableHead className={cn(th, patroStickyHeadCell)}>
              {t("dainik.notes")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.dateAd}>
              <TableCell className={cn(td, "w-14", dainikKrantiClasses.calcDay)}>
                {digits(group.day)}
              </TableCell>
              <TableCell className={td}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {group.notes.map((note, i) => (
                    <span
                      key={`${note.kind}-${note.text}`}
                      className="inline-flex max-w-full flex-wrap items-baseline gap-1"
                    >
                      {i > 0 ? (
                        <span aria-hidden>
                          ·
                        </span>
                      ) : null}
                      <KindBadge kind={note.kind} />
                      <span className="text-foreground">
                        {bilingualText(lang, note.text, note.textEn ?? note.text)}
                      </span>
                    </span>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const legend = (
    <section className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <h4 className={dainikKrantiClasses.legendHeading}>
        {t("dainik.planet_rise_set_symbols")}
      </h4>
      <dl className="space-y-1.5">
        {UDAYAST_LEGEND.map((it) => (
          <div key={it.code} className={dainikKrantiClasses.legendRow}>
            <dt className={cn("w-24", dainikKrantiClasses.legendCodeCol)}>
              <span className={cn(dainikKrantiClasses.legendCodeChip, dainikKrantiClasses.legendCodeText, "sm:text-sm")}>
                {it.code}
              </span>
            </dt>
            <dd>
              <span className={dainikKrantiClasses.legendMeaning}>{bilingualText(lang, it.full, it.fullEn)}</span> — {bilingualText(lang, it.meaning, it.meaningEn)}
            </dd>
          </div>
        ))}
      </dl>
      <p className={dainikKrantiClasses.calcLegendNote}>
        {bilingualNode(lang, <>
            <span className={dainikKrantiClasses.legendStrong}>दशा कोष्ठक:</span> जन्म-समयमा बाँकी
            विंशोत्तरी दशाको वर्ष/महिना/दिन।{" "}
            <span className={dainikKrantiClasses.legendStrong}>समय सुधार:</span> मुद्रणमा “उ” वा “०”
            जस्ता सङ्केतले शून्य अंश/कला जनाउँछ। सूचीबद्ध सूर्योदयमा देशान्तर समायोजित छ;
            बेलान्तर सन्दर्भका लागि मात्र देखाइन्छ।
          </>, <>
            <span className={dainikKrantiClasses.legendStrong}>Dasha bracket:</span> the years/months/days
            of Vimshottari dasha remaining at birth.{" "}
            <span className={dainikKrantiClasses.legendStrong}>Time correction:</span> in print, symbols like
            “u” or “0” indicate zero degrees/kala. Listed sunrise already includes Deshaantar;
            Belaantar is shown for reference only.
          </>,)}
      </p>
    </section>
  );

  if (embedded) {
    return (
      <div>
        {notesTable}
        {legend}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PatroTableShell
        titleNe="गणना सूचना र विशेष दिनहरू"
        titleEn="Special Calculation Notes"
        subtitle="ग्रह सङ्क्रान्ति, २४:०० पछिको लग्न/ग्रहचार, र अधिक/शुद्ध पक्ष सीमाहरू — जन्मकुण्डली र विधि समयका लागि ध्यान दिनुपर्ने दिनहरू।"
        subtitleEn="Planetary sankrantis, post-24:00 lagna/transits, and adhik/shuddha paksha boundaries — days to note for birth-chart and ritual timing."
      >
        {notesTable}
      </PatroTableShell>
      {legend}
    </div>
  );
}
