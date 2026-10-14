/**
 * The nine-graha gochar strip inside "why this reading?", shared by the
 * website's and the app's `components/rashifal/RashifalGocharChips.tsx`: one
 * chip per graha with the house counted from the sign, its tone, the three
 * transit flags with their labels, and a legend for the flags on screen.
 */
import type { RashifalGocharRow } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

export type RashifalGocharFlag = "vedha" | "retrograde" | "combust";

export type RashifalGocharChip = {
  key: string;
  graha: string;
  house: string;
  /** Vedha (a transit cancelled) outranks a favourable/unfavourable house. */
  tone: "vedha" | "good" | "bad";
  /** Full sentence for the tooltip / accessibility label. */
  hint: string;
  flags: { flag: RashifalGocharFlag; label: string }[];
};

const FLAG_KEYS: Record<RashifalGocharFlag, string> = {
  vedha: "rashifal.flags.vedha",
  retrograde: "rashifal.flags.retrograde",
  combust: "rashifal.flags.combust",
};

export function useRashifalGocharChips(rows: RashifalGocharRow[]) {
  const { t, lang, digits } = useLocale();
  const ne = lang === "ne";

  const chips: RashifalGocharChip[] = rows.map((row) => {
    const graha = ne ? row.graha_ne : row.graha_en;
    const vedhaName = (ne ? row.vedha_by_ne : row.vedha_by) ?? row.vedha_by;
    const flags: RashifalGocharChip["flags"] = [];
    if (row.vedha_by) flags.push({ flag: "vedha", label: vedhaName ? t("rashifal.flags.vedha_by", { graha: vedhaName }) : t(FLAG_KEYS.vedha) });
    if (row.retrograde) flags.push({ flag: "retrograde", label: t(FLAG_KEYS.retrograde) });
    if (row.combust) flags.push({ flag: "combust", label: t(FLAG_KEYS.combust) });
    return {
      key: row.graha,
      graha,
      house: digits(row.house),
      tone: row.vedha_by ? "vedha" : row.favourable ? "good" : "bad",
      hint: t("rashifal.gochar_hint", { graha, house: digits(row.house), sign: ne ? row.sign_ne : row.sign_en }),
      flags,
    };
  });

  // Only explain the marks that are actually on screen.
  const shown = new Set(chips.flatMap((c) => c.flags.map((f) => f.flag)));
  const legend = (["vedha", "retrograde", "combust"] as const)
    .filter((flag) => shown.has(flag))
    .map((flag) => ({ flag, label: t(FLAG_KEYS[flag]) }));

  return { chips, legend };
}
