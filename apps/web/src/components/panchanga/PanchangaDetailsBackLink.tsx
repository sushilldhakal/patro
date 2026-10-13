import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import { cn } from "@vedic-patro/domain/utils";

type PanchangaDetailsBackLinkProps = {
  /** i18n key for link label */
  labelKey?: string;
  className?: string;
  /** default: bottom margin for graha/element pages; inline: sait-style footer */
  variant?: "footer" | "inline";
};

export function PanchangaDetailsBackLink({
  labelKey = "element_page.all_elements",
  className,
  variant = "footer",
}: PanchangaDetailsBackLinkProps) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        panchangaPageClasses.directory.backLink,
        variant === "footer" && panchangaPageClasses.directory.backLinkFooter,
        className,
      )}
    >
      <Link to="/panchanga/details" className={panchangaPageClasses.directory.backLinkText}>
        {t(labelKey)}
      </Link>
    </p>
  );
}
