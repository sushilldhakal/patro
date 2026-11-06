import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { useLocale } from "@/lib/i18n";
import { displayLocationLabel, usePanchangaLocation } from "@/lib/use-panchanga-location";

/**
 * The line at the foot of every page: what computed the panchanga and for which place — the one the
 * reader picked (Clayton, if they chose Clayton), not always Kathmandu. Privacy, terms, support and
 * the website live in Settings → About.
 */
export function SiteFooter({ className, paddingHorizontal }: { className?: string; paddingHorizontal?: number }) {
  const { lang } = useLocale();
  const { location } = usePanchangaLocation();
  return <PatroFooterNote locationLabel={displayLocationLabel(location, null, lang)} className={className} paddingHorizontal={paddingHorizontal} />;
}
