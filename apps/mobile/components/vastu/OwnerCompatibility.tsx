import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { fetchPanchanga } from "@/lib/api";
import type { FetchCivilDay } from "@vedic-patro/features/vastu";
import { OwnerCompatibility as Shared } from "@vedic-patro/ui/kit/jyotish";

const fetchDay: FetchCivilDay = (dateAd, location) => fetchPanchanga(dateAd, "ad", location);

/** Profile picker, place control and the day fetch stay in the app. */
export function OwnerCompatibility() {
  return (
    <Shared
      fetchDay={fetchDay}
      renderProfile={(args) => <SaitProfilePicker selectedId={args.selectedId} onSelect={args.onSelect} />}
      renderPlace={({ location, onChange }) => <PatroHeaderLocation location={location} onLocationChange={onChange} />}
      renderSelect={({ label, value, onChange: setValue, options }) => (
        <NativeStringSelect value={value} ariaLabel={label} options={options.map((option) => ({ value: option.id, label: option.label }))} onChange={setValue} />
      )}
    />
  );
}
