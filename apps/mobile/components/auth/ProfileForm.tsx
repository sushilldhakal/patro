import { useState } from "react";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { afterProfileSaved } from "@/lib/notifications/triggers";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { DEFAULT_PANCHANGA_LOCATION, type PanchangaLocation } from "@/lib/use-panchanga-location";
import { ProfileForm as Shared } from "@vedic-patro/ui/kit/jyotish";
import { DateField, TimeField } from "@/components/ui/WheelPickers";
import { requestLocationPicker, type PlacePick } from "@/lib/menu-request";

export { EMPTY_PROFILE, profileToInput } from "@vedic-patro/features/account";

function inputToLocation(form: ProfileInput): PanchangaLocation {
  if (form.latitude != null && form.longitude != null) {
    return {
      label: form.location_label || form.city || "",
      params: {
        lat: form.latitude,
        lon: form.longitude,
        ...(form.timezone ? { timezone: form.timezone } : {}),
      },
    };
  }
  return DEFAULT_PANCHANGA_LOCATION;
}

/** Place picker and reminder reschedule stay in the app. The fields are shared. */
export function ProfileForm({
  initial,
  existing,
  onCancel,
  onSaved,
  store,
  minimal,
}: {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
  /** Keep it on the phone instead of the account (the signed-out kundali). */
  store?: (input: ProfileInput) => Promise<Profile>;
  minimal?: boolean;
}) {
  const { lang } = useLocale();
  const [birthLocation, setBirthLocation] = useState<PanchangaLocation>(() => inputToLocation(initial));
  return (
    <Shared
      initial={initial}
      existing={existing}
      onCancel={onCancel}
      onSaved={onSaved}
      store={store}
      minimal={minimal}
      afterSave={(isNew) => void afterProfileSaved(lang === "en" ? "en" : "ne", isNew)}
      // The birth place: the app's Location screen (saved places, search), handing the choice back here.
      renderPlace={({ onSelectLabel }) => (
        <PatroHeaderLocation
          location={birthLocation}
          onLocationChange={() => {}}
          open={false}
          onOpenChange={(next) => {
            if (!next) return;
            requestLocationPicker(((loc) => {
              const picked = loc as PanchangaLocation;
              setBirthLocation(picked);
              onSelectLabel(picked.label, picked.params.lat, picked.params.lon, picked.params.timezone);
            }) satisfies PlacePick);
          }}
        />
      )}
      renderDate={(a) => <DateField {...a} />}
      renderTime={(a) => <TimeField {...a} />}
    />
  );
}
