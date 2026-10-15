import { CalendarClock } from "lucide-react";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { fetchPanchangaDay } from "@/lib/api";
import { patroDayFetchFromApiDateAd } from "@/lib/patro-day-url";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { useOwnerCompatibility, type FetchCivilDay } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

const fetchDay: FetchCivilDay = (dateAd, location, language) =>
  fetchPanchangaDay(patroDayFetchFromApiDateAd(dateAd, { era: "ad", language }), location);

export function OwnerCompatibility() {
  const v = useOwnerCompatibility({ fetchDay });

  return (
    <div className={vastuClasses.ownerCard}>
      <div className={vastuClasses.ownerHeader}>
        <CalendarClock className="h-4 w-4 shrink-0 text-secondary" />
        <h3 className={vastuClasses.ownerHeading}>{v.copy.heading}</h3>
      </div>

      <div className={vastuClasses.ownerBody}>
        <p className={vastuClasses.planBlurb}>{v.copy.blurb}</p>

        <SaitProfilePicker selectedId={v.selectedProfile?.id ?? null} onSelect={v.setSelectedProfile} />

        {v.hasProfile && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="vastu-construction-date" className={cn(vastuClasses.fieldLabel, "block")}>
                  {v.copy.dateLabel}
                </label>
                <input
                  id="vastu-construction-date"
                  type="date"
                  value={v.candidateDate}
                  onChange={(e) => v.setCandidateDate(e.target.value)}
                  className={vastuClasses.dateControl}
                />
              </div>
              <div>
                <p className={vastuClasses.fieldLabel}>{v.copy.placeLabel}</p>
                <LocationSelector compact location={v.plotLocation} onLocationChange={v.setPlotLocation} />
              </div>
            </div>

            {v.status && <p className={vastuClasses.mutedNote}>{v.status}</p>}
            {v.error && <p className={vastuClasses.destructiveText}>{v.error}</p>}

            {v.result && (
              <div className={cn(vastuClasses.ownerResult, patroNavataraToneBg(v.result.tone))}>
                <p className={vastuClasses.ownerResultTitle}>{v.result.title}</p>
                <p className={vastuClasses.ownerResultVerdict}>{v.result.verdict}</p>
                <p className={vastuClasses.infoDisclaimer}>{v.result.disclaimer}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OwnerCompatibility;
