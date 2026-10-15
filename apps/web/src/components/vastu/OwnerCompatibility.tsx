import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { PatroHeaderLocation } from "@/components/patro-date";
import { fetchPanchangaDay } from "@/lib/api";
import { patroDayFetchFromApiDateAd } from "@/lib/patro-day-url";
import type { FetchCivilDay } from "@vedic-patro/features/vastu";
import { OwnerCompatibility as Shared } from "@vedic-patro/ui/kit/jyotish";

const fetchDay: FetchCivilDay = (dateAd, location, language) =>
  fetchPanchangaDay(patroDayFetchFromApiDateAd(dateAd, { era: "ad", language }), location);

/** Profile picker, place control and the day fetch stay in the app. */
export function OwnerCompatibility() {
  return (
    <Shared
      fetchDay={fetchDay}
      renderProfile={(args) => <SaitProfilePicker selectedId={args.selectedId} onSelect={args.onSelect} />}
      renderPlace={({ location, onChange }) => <PatroHeaderLocation location={location} onLocationChange={onChange} />}
    />
  );
}

export default OwnerCompatibility;
