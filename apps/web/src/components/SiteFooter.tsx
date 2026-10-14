import { Link } from "@tanstack/react-router";
import { useSiteFooter } from "@vedic-patro/features/common";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/domain/utils";

export function SiteFooter() {
  const links = useSiteFooter();
  return (
    <footer className={shellClasses.footer}>
      <div className={cn("flex flex-wrap", shellClasses.footerRow, shellClasses.footerLink)}>
        {links.map((link) =>
          link.kind === "page" ? (
            <Link key={link.id} to={link.path as "/privacy" | "/terms"} className="hover:text-foreground">
              {link.label}
            </Link>
          ) : (
            <a key={link.id} href={link.url} className="hover:text-foreground">
              {link.label}
            </a>
          ),
        )}
      </div>
    </footer>
  );
}
