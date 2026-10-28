/**
 * The Brahma Māna page, shared by the website's `pages/BrahmaMana.tsx` and the app's
 * `app/brahma-mana.tsx`: the tree rows with which branches are open, the two tables, the path to
 * now and the notes. Opens fully, so the whole ladder reads top to bottom at first sight.
 */
import { useCallback, useMemo, useState } from "react";
import type { BrahmaNodeId } from "@vedic-patro/domain/calendar/brahma-mana";
import { useLocale } from "@vedic-patro/i18n/react";
import { BRAHMA_BRANCH_IDS, brahmaNotes, brahmaTreeRows, nowLines, padaRows, yearsRows, type BrahmaTreeRow } from "./model";

const LEARN_SLUGS = ["ghati-pala", "calendar-differences"];

export function useBrahmaManaPage() {
  const { t, lang, digits } = useLocale();
  const text = useMemo(() => ({ t, lang, digits }), [t, lang, digits]);
  const [open, setOpen] = useState<ReadonlySet<BrahmaNodeId>>(() => new Set(BRAHMA_BRANCH_IDS));

  const allRows = useMemo(() => brahmaTreeRows(text), [text]);
  /** Rows under a closed branch are left out. */
  const rows = useMemo(() => allRows.filter((r) => r.ancestors.every((a) => open.has(a))), [allRows, open]);

  const toggle = useCallback((id: BrahmaNodeId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const allOpen = open.size === BRAHMA_BRANCH_IDS.length;
  const toggleAll = useCallback(() => {
    setOpen((prev) => (prev.size === BRAHMA_BRANCH_IDS.length ? new Set<BrahmaNodeId>([BRAHMA_BRANCH_IDS[0]!]) : new Set(BRAHMA_BRANCH_IDS)));
  }, []);

  const ceYear = new Date().getFullYear();
  const now = useMemo(() => nowLines(ceYear, text), [ceYear, text]);
  const pada = useMemo(() => padaRows(text), [text]);
  const years = useMemo(() => yearsRows(text), [text]);
  const notes = useMemo(() => brahmaNotes(text), [text]);

  return {
    title: t("brahma_mana.title"),
    subtitle: t("brahma_mana.subtitle"),
    tree: {
      title: t("brahma_mana.tree_title"),
      hint: t("brahma_mana.tree_hint"),
      rows,
      isOpen: (row: BrahmaTreeRow) => open.has(row.id),
      toggle,
      allOpen,
      toggleAll,
      toggleAllLabel: allOpen ? t("brahma_mana.collapse_all") : t("brahma_mana.expand_all"),
      nowLabel: t("brahma_mana.now"),
    },
    now: { title: t("brahma_mana.now_title"), lines: now },
    pada: {
      title: t("brahma_mana.pada_title"),
      caption: t("brahma_mana.pada_caption", { pada: digits((432_000).toLocaleString("en-US")) }),
      note: t("brahma_mana.pada_note"),
      cols: [t("brahma_mana.col_yuga"), t("brahma_mana.col_padas"), t("brahma_mana.col_calc"), t("brahma_mana.col_years")] as const,
      rows: pada,
    },
    years: {
      title: t("brahma_mana.years_title"),
      cols: [t("brahma_mana.col_unit"), t("brahma_mana.col_years"), t("brahma_mana.col_roughly")] as const,
      rows: years,
    },
    notes: { title: t("brahma_mana.notes_title"), items: notes },
    source: t("brahma_mana.source"),
    learnSlugs: LEARN_SLUGS,
  };
}

export type BrahmaManaPage = ReturnType<typeof useBrahmaManaPage>;
