import { KundaliSection } from "@/components/kundali/KundaliSections";
import type { LocationParams } from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/calendar/instant-query";
import { KundaliReport as Shared } from "@vedic-patro/ui/kit/jyotish";

export function KundaliReport(props: { moment: InstantQuery; location?: LocationParams; ayanamsha?: string; disabled?: boolean }) {
  return <Shared {...props} renderShell={({ title, children }) => <KundaliSection title={title} icon="document-text-outline">{children}</KundaliSection>} />;
}
