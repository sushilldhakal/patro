import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
        "text-sm",
        variant === "footer" && "mt-6",
        className,
      )}
    >
      <Link to="/panchanga/details" className="text-primary underline">
        {t(labelKey)}
      </Link>
    </p>
  );
}
