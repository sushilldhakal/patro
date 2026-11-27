import { useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PLACES_STORAGE_KEY, type WeatherPlace } from "@vedic-patro/features/weather";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
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
  const saved = useSavedPlaces();
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
        <>
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
        {/* The reader's saved places (device, and the account when signed in): one tap fills the birth place. */}
        {saved.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pt-2">
            {saved.map((p) => {
              const on = birthLocation.params.lat === p.params.lat && birthLocation.params.lon === p.params.lon;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    const picked = { label: p.label, params: p.params } as PanchangaLocation;
                    setBirthLocation(picked);
                    onSelectLabel(p.label, p.params.lat, p.params.lon, p.params.timezone);
                  }}
                  className={on ? "rounded-full border border-secondary bg-secondary/10 px-3 py-1.5" : "rounded-full border border-border px-3 py-1.5"}
                >
                  <Text className={on ? "text-sm font-semibold text-secondary" : "text-sm text-foreground"} style={nepaliTextStyle(13)}>
                    {p.label.split(",")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        </>
      )}
      renderDate={(a) => <DateField {...a} />}
      renderTime={(a) => <TimeField {...a} />}
    />
  );
}

/** The saved places list (lib/places-sync keeps it on the device and the account). */
function useSavedPlaces(): WeatherPlace[] {
  const [places, setPlaces] = useState<WeatherPlace[]>([]);
  useEffect(() => {
    void AsyncStorage.getItem(PLACES_STORAGE_KEY).then((raw) => {
      try {
        const v = raw ? (JSON.parse(raw) as { places?: WeatherPlace[] }) : null;
        setPlaces((v?.places ?? []).filter((p) => p?.label && p.params?.lat != null && p.params?.lon != null));
      } catch {
        setPlaces([]);
      }
    });
  }, []);
  return places;
}
