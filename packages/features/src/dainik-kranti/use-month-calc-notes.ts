/**
 * The dainik kranti month's calculation notes table and the rise-set symbol
 * legend, shared by the website's and the app's
 * `components/dainikKranti/MonthCalcNotes.tsx`: notes grouped by day and
 * ordered by kind, kind labels, and copy.
 */
import type { CalcNote } from "@vedic-patro/domain/jyotish/dainikKranti/month-patro-tables";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

const KIND_ORDER: Record<CalcNote["kind"], number> = {
  paksha_boundary: 0,
  late_night: 1,
  ingress: 2,
  udayast: 3,
  motion: 4,
};

const UDAYAST_LEGEND_COUNT = 5;

export type CalcNoteGroup = {
  key: string;
  day: string;
  notes: { key: string; kind: CalcNote["kind"]; kindLabel: string; text: string }[];
};

export function useMonthCalcNotes(notes: CalcNote[], loading?: boolean) {
  const { t, lang, digits } = useLocale();
  const byDate = new Map<string, { day: number; dateAd: string; notes: CalcNote[] }>();
  for (const note of notes) {
    const group = byDate.get(note.dateAd);
    if (group) group.notes.push(note);
    else byDate.set(note.dateAd, { day: note.day, dateAd: note.dateAd, notes: [note] });
  }
  const groups: CalcNoteGroup[] = [...byDate.values()]
    .sort((a, b) => a.day - b.day || a.dateAd.localeCompare(b.dateAd))
    .map((group) => ({
      key: group.dateAd,
      day: digits(group.day),
      notes: [...group.notes]
        .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.text.localeCompare(b.text))
        .map((note) => ({
          key: `${note.kind}-${note.text}`,
          kind: note.kind,
          kindLabel: t(`dainik.calc_kind.${note.kind}`),
          text: bilingualText(lang, note.text, note.textEn ?? note.text),
        })),
    }));

  return {
    status: (loading ? "loading" : groups.length === 0 ? "empty" : "ready") as "loading" | "empty" | "ready",
    groups,
    legend: Array.from({ length: UDAYAST_LEGEND_COUNT }, (_, i) => ({
      code: t(`dainik.udayast_legend.${i + 1}.code`),
      full: t(`dainik.udayast_legend.${i + 1}.full`),
      meaning: t(`dainik.udayast_legend.${i + 1}.meaning`),
    })),
    /** `Trans` key; <b> marks the bracket names. */
    legendNoteKey: "dainik.calc_legend_note",
    copy: {
      loading: t("dainik.loading"),
      empty: t("dainik.no_special_calculation_notes_this_month"),
      date: t("dainik.date"),
      notes: t("dainik.notes"),
      legendTitle: t("dainik.planet_rise_set_symbols"),
    },
  };
}
