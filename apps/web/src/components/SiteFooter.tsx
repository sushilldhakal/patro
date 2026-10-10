import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE } from "@/shared/legal-copy";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          {t("footer.terms")}
        </Link>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="hover:text-foreground">
          {t("footer.support")}
        </a>
        <a href={LEGAL_SITE} className="hover:text-foreground">
          vedicpatro.com
        </a>
      </div>
    </footer>
  );
}
