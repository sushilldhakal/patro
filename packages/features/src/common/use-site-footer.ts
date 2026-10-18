/**
 * The links row that closes every page, shared by the website's
 * `components/SiteFooter.tsx` and the app's `components/branding/SiteFooter.tsx`:
 * Privacy, Terms, Support (mail) and the site, with labels and targets.
 */
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE } from "@vedic-patro/domain/identity/legal-copy";
import { useLocale } from "@vedic-patro/i18n/react";

export type SiteFooterLink =
  | { id: "privacy" | "terms"; kind: "page"; label: string; path: string }
  | { id: "support" | "site"; kind: "external"; label: string; url: string };

export function useSiteFooter(): SiteFooterLink[] {
  const { t } = useLocale();
  return [
    { id: "privacy", kind: "page", label: t("footer.privacy"), path: "/privacy" },
    { id: "terms", kind: "page", label: t("footer.terms"), path: "/terms" },
    { id: "support", kind: "external", label: t("footer.support"), url: `mailto:${LEGAL_CONTACT_EMAIL}` },
    { id: "site", kind: "external", label: "vedicpatro.com", url: LEGAL_SITE },
  ];
}
