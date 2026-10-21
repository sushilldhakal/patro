/**
 * Privacy policy and terms — the text both apps show, in the reader's
 * language. The copy itself lives in `@vedic-patro/domain/identity/legal-copy`.
 */
import { LEGAL_UPDATED, LEGAL_UPDATED_NE, PRIVACY_INTRO, PRIVACY_SECTIONS, TERMS_INTRO, TERMS_SECTIONS } from "@vedic-patro/domain/identity/legal-copy";
import { useLocale } from "@vedic-patro/i18n/react";

export type LegalKind = "privacy" | "terms";

export function useLegalPage(kind: LegalKind) {
  const { t, lang } = useLocale();
  const pick = (v: { ne: string; en: string }) => (lang === "en" ? v.en : v.ne);
  const [intro, sections] = kind === "privacy" ? [PRIVACY_INTRO, PRIVACY_SECTIONS] : [TERMS_INTRO, TERMS_SECTIONS];
  return {
    title: t(kind === "privacy" ? "legal.privacy_title" : "legal.terms_title"),
    updated: t("legal.updated", { date: lang === "en" ? LEGAL_UPDATED : LEGAL_UPDATED_NE }),
    intro: pick(intro),
    sections: sections.map((s) => ({ key: s.heading.en, heading: pick(s.heading), paragraphs: s.body.map((p) => ({ key: p.en, text: pick(p) })) })),
  };
}
