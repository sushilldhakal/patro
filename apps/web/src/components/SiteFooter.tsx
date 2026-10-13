import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE } from "@vedic-patro/domain/legal-copy";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/domain/utils";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className={shellClasses.footer}>
      <div className={cn("flex flex-wrap", shellClasses.footerRow, shellClasses.footerLink)}>
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
