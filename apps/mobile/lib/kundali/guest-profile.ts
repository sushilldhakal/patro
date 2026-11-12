import { useCallback, useEffect, useState } from "react";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { deviceStore } from "@/lib/device-store";

/** The route id of the kundali a signed-out reader made: `/kundali/guest`. */
export const GUEST_PROFILE_ID = "guest";

const KEY = "kundali.guest-profile.v1";

/** The last one read or saved this session: the chart opens at once after a save, and still opens where
 *  the device store is unavailable (the web build, where it is a no-op). */
let cached: Profile | null | undefined;

/**
 * A kundali needs no account: the chart is worked out from the birth moment and place alone. A
 * signed-out reader's birth details stay on this phone (one profile); signing in is for keeping
 * several and seeing them on any device.
 */
export async function getGuestProfile(): Promise<Profile | null> {
  if (cached !== undefined) return cached;
  cached = await deviceStore.get<Profile>(KEY);
  return cached;
}

export async function saveGuestProfile(input: ProfileInput): Promise<Profile> {
  const now = new Date().toISOString();
  const previous = await getGuestProfile();
  const profile: Profile = {
    id: GUEST_PROFILE_ID,
    full_name: input.full_name,
    phone: null,
    email: null,
    gender: input.gender ?? null,
    country: input.country ?? null,
    city: input.city ?? null,
    location_label: input.location_label ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    timezone: input.timezone ?? null,
    birth_date: input.birth_date ?? null,
    birth_time: input.birth_time ?? null,
    birth_era: input.birth_era ?? null,
    notes: null,
    is_default: true,
    created_at: previous?.created_at ?? now,
    updated_at: now,
  };
  cached = profile;
  await deviceStore.set(KEY, profile);
  return profile;
}

/** The phone's kundali: `undefined` while it is read, `null` when there is none. */
export function useGuestProfile() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const reload = useCallback(() => {
    void getGuestProfile().then(setProfile);
  }, []);
  useEffect(reload, [reload]);
  return { profile, reload, setProfile };
}
