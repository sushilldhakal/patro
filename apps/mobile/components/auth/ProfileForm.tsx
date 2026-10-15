import { useState } from "react";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { afterProfileSaved } from "@/lib/notifications/triggers";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { DEFAULT_PANCHANGA_LOCATION, type PanchangaLocation } from "@/lib/use-panchanga-location";
import { ProfileForm as Shared } from "@vedic-patro/ui/kit/jyotish";

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
}: {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
}) {
  const { lang } = useLocale();
  const [birthLocation, setBirthLocation] = useState<PanchangaLocation>(() => inputToLocation(initial));
  return (
    <Shared
      initial={initial}
      existing={existing}
      onCancel={onCancel}
      onSaved={onSaved}
      afterSave={(isNew) => void afterProfileSaved(lang === "en" ? "en" : "ne", isNew)}
      renderPlace={({ onSelectLabel }) => (
        <PatroHeaderLocation
          location={birthLocation}
          onLocationChange={(loc) => {
            setBirthLocation(loc);
            onSelectLabel(loc.label, loc.params.lat, loc.params.lon, loc.params.timezone);
          }}
        />
      )}
    />
  );
}
