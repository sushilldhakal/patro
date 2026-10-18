import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { BhavaTable, KundaliSection } from "@/components/kundali/KundaliSections";
import type { VargaCharts } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import type { DivisionalPanelConfig } from "@vedic-patro/features/kundali";
import { DivisionalChartCompare as Shared } from "@vedic-patro/ui/kit/jyotish";

export function DivisionalChartCompare(props: { vargaCharts: VargaCharts; combustion?: Record<string, boolean | null>; defaultLeft?: DivisionalPanelConfig; defaultRight?: DivisionalPanelConfig }) {
  return (
    <Shared
      {...props}
      renderSelect={({ label, value, onChange, options }) => (
        <NativeStringSelect value={value} ariaLabel={label} options={options.map((option) => ({ value: option.id, label: option.label }))} onChange={onChange} />
      )}
      renderChart={(houses) => <D1Chart houses={houses} />}
      renderLegend={() => <GrahaStatusLegend />}
      renderBhava={(args) => <BhavaTable {...args} />}
      renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />}
      renderShell={({ title, subtitle, children }) => <KundaliSection title={title} subtitle={subtitle} icon="grid-outline">{children}</KundaliSection>}
    />
  );
}
