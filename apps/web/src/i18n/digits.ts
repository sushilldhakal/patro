import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./index";

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"] as const;

/** Always converts 0-9 to Devanagari digits (ignores locale). */
export function toDevanagariDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)] ?? d);
}

export function usesDevanagariDigits(lang?: string): boolean {
  const code = (lang ?? i18n.language)?.slice(0, 2) ?? "ne";
  return code === "ne";
}

/** Locale-aware: Devanagari for ne/hi, Western for en. */
export function formatLocaleDigits(value: string | number, lang?: string): string {
  if (!usesDevanagariDigits(lang)) return String(value);
  return toDevanagariDigits(value);
}

/** Locale-aware digits for tabular number spans (`.font-num` / `.font-mono`). */
export function formatMonoDigits(
  value: string | number | null | undefined,
  lang?: string,
): string {
  if (value == null) return "";
  return formatLocaleDigits(value, lang);
}

export function useLocaleDigits() {
  const { i18n: inst } = useTranslation();
  return useCallback(
    (value: string | number) => formatLocaleDigits(value, inst.language),
    [inst.language],
  );
}
