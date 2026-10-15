import type { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import type { Era } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { SaitRule } from "@vedic-patro/ui/kit/jyotish";
import { SaitCeremonyLayout as Shared } from "@vedic-patro/ui/kit/jyotish";
import { PageHeader, PageShell } from "@/components/PageShell";
import type { BratabandhaNakshatraMode, SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";

interface Props {
  title: string;
  subtitle: string;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  era: Era;
  gregorianRange?: { start: string; end: string } | null;
  rangeLabel?: string | null;
  yearError?: string | null;
  location: PanchangaLocation;
  onLocationChange: (loc: PanchangaLocation) => void;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  rulesBusy?: boolean;
  nakshatraMode?: BratabandhaNakshatraMode | null;
  onNakshatraModeChange?: (mode: BratabandhaNakshatraMode) => void;
  days?: SaitDetailDay[];
  count?: number;
  profileControl?: ReactNode;
  suitabilityByDay?: Map<string, SaitSuitability>;
  personalizeByDay?: Map<string, SaitPersonalizeDay>;
  loading: boolean;
  notice?: ReactNode;
  children?: ReactNode;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
  footer?: ReactNode;
}

/** Page shell, year bar and the back link stay here. The list is shared. */
export function SaitCeremonyLayout(props: Props) {
  return (
    <Shared
      year={props.year}
      method={props.method}
      rules={props.rules}
      engineVersion={props.engineVersion}
      enabledRuleIds={props.enabledRuleIds}
      onToggleRule={props.onToggleRule}
      rulesBusy={props.rulesBusy}
      nakshatraMode={props.nakshatraMode}
      onNakshatraModeChange={props.onNakshatraModeChange}
      days={props.days}
      count={props.count}
      profileControl={props.profileControl}
      suitabilityByDay={props.suitabilityByDay}
      personalizeByDay={props.personalizeByDay}
      loading={props.loading}
      notice={props.notice}
      emptyLabel={props.emptyLabel}
      countLabel={props.countLabel}
      footer={props.footer}
      renderShell={(children) => <PageShell>{children}</PageShell>}
      renderHeader={() => <PageHeader icon={<HeartHandshake className="h-6 w-6 text-secondary" />} title={props.title} subtitle={props.subtitle} />}
      renderYearNav={() => (
        <PatroYearNavBlock
          era={props.era}
          year={props.year}
          onYearChange={props.onYearChange}
          onEraChange={props.onEraChange}
          gregorianRange={props.gregorianRange}
          rangeLabel={props.rangeLabel}
          yearError={props.yearError}
          location={props.location}
          onLocationChange={props.onLocationChange}
          className=""
        />
      )}
      renderBack={() => <PanchangaDetailsBackLink labelKey="sait.all_ceremonies" variant="inline" />}
    >
      {props.children}
    </Shared>
  );
}

export default SaitCeremonyLayout;
