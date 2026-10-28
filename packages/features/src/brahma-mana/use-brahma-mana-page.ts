/**
 * The Brahma Māna page, shared by the website's `pages/BrahmaMana.tsx` and the app's
 * `app/brahma-mana.tsx`: the instance tree (parārdha #2 → … → Kali Yuga) with which nodes are
 * open, the two tables, the path to now and the notes. Opens on the path to now.
 */
import { useCallback, useMemo, useState } from "react";
import { nowPathKeys } from "@vedic-patro/domain/calendar/brahma-mana";
import { useLocale } from "@vedic-patro/i18n/react";
import { brahmaLadder, brahmaNotes, brahmaTreeRows, nowLines, padaRows, yearsRows } from "./model";

const LEARN_SLUGS = ["ghati-pala", "calendar-differences"];

export function useBrahmaManaPage() {
  const { t, lang, digits } = useLocale();
  const text = useMemo(() => ({ t, lang, digits }), [t, lang, digits]);
  /** Open node keys. The page opens on the path to now; everything else is built only when opened. */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(nowPathKeys()));
  const rows = useMemo(() => brahmaTreeRows(open, text), [open, text]);

  const toggle = useCallback((key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const showNow = useCallback(() => setOpen(new Set(nowPathKeys())), []);
  const collapseAll = useCallback(() => setOpen(new Set(["L"])), []);

  /** The phone view's level: it opens on the Mahāyuga we are in, its four Yugas below. */
  const nowFocus = useMemo(() => {
    const keys = nowPathKeys();
    return keys[keys.length - 3]!;
  }, []);
  const [focusKey, setFocusKey] = useState(nowFocus);
  const ladder = useMemo(() => brahmaLadder(focusKey, text), [focusKey, text]);
  const parentKey = ladder.trail.length ? ladder.trail[ladder.trail.length - 1]!.key : null;

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
      unit: t("brahma_mana.divya_unit"),
      rootMana: t("brahma_mana.mana.brahma"),
      rows,
      toggle,
      showNow,
      showNowLabel: t("brahma_mana.show_now"),
      collapseAll,
      collapseAllLabel: t("brahma_mana.collapse_all"),
      nowLabel: t("brahma_mana.now"),
    },
    ladder: {
      ...ladder,
      hint: t("brahma_mana.ladder_hint"),
      partsLabel: t("brahma_mana.ladder_parts", { n: digits(ladder.parts.length) }),
      endLabel: t("brahma_mana.ladder_end"),
      nowLabel: t("brahma_mana.now"),
      focusOn: setFocusKey,
      up: parentKey ? () => setFocusKey(parentKey) : undefined,
      upLabel: t("brahma_mana.ladder_up"),
      toNow: () => setFocusKey(nowFocus),
      toNowLabel: t("brahma_mana.show_now"),
      atNow: focusKey === nowFocus,
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
      cols: [t("brahma_mana.col_unit"), t("brahma_mana.col_divya"), t("brahma_mana.col_years"), t("brahma_mana.col_roughly")] as const,
      rows: years,
    },
    notes: { title: t("brahma_mana.notes_title"), items: notes },
    source: t("brahma_mana.source"),
    learnSlugs: LEARN_SLUGS,
  };
}

export type BrahmaManaPage = ReturnType<typeof useBrahmaManaPage>;
