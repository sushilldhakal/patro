import { PanchangaSection } from "@/components/panchanga/PanchangaLayout";
import type { LocationParams } from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import { KundaliReport as Shared } from "@vedic-patro/ui/kit/jyotish";

export function KundaliReport(props: { moment: InstantQuery; location?: LocationParams; ayanamsha?: string; disabled?: boolean }) {
  return <Shared {...props} renderShell={({ children }) => <PanchangaSection titleKey="kundali.report.title">{children}</PanchangaSection>} />;
}

export default KundaliReport;
