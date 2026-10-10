import { useInPanchangaShell } from "@/components/panchanga/PanchangaShellLayout";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import { cn } from "../lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** When false, skip the bottom related-links block (e.g. hub with a full directory). */
  showRelatedLinks?: boolean;
}

/**
 * Page content wrapper. The left panchanga sidebar is mounted once by
 * PanchangaShellLayout for /kundali and other shell routes — never duplicate
 * it here (that produced two sidebars when shell context was briefly false).
 */
export function PageShell({ children, className, showRelatedLinks = true }: Props) {
  const inShell = useInPanchangaShell();

  if (inShell) {
    return (
      <div className={cn("min-w-0 max-w-full space-y-8 overflow-x-hidden", className)}>
        {children}
        {showRelatedLinks ? <RelatedPageLinks /> : null}
      </div>
    );
  }

  return (
    <main className={cn("max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8", className)}>
      {children}
      {showRelatedLinks ? <RelatedPageLinks /> : null}
    </main>
  );
}

export function PageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
