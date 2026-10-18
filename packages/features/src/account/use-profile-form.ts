/**
 * The saved-profile form (add or edit a birth profile), shared by the
 * website's and the app's `components/auth/ProfileForm.tsx`: the blank and
 * edit inputs, field state and formatting, the gender and calendar choices,
 * saving, and copy. Each app draws its own fields and place picker.
 */
import { useState } from "react";
import { createProfile, updateProfile, type Profile, type ProfileInput } from "@vedic-patro/api-client";
import { formatDateInput, formatTimeInput } from "@vedic-patro/domain/identity/birth-date";
import { useLocale } from "@vedic-patro/i18n/react";

/** Blank profile, used when adding a new one. */
export const EMPTY_PROFILE: ProfileInput = {
  full_name: "",
  phone: "",
  email: "",
  gender: "",
  country: "",
  city: "",
  location_label: "",
  latitude: null,
  longitude: null,
  timezone: "",
  birth_date: "",
  birth_time: "",
  birth_era: "bs",
  is_default: false,
};

/** Map a saved profile to editable form input. */
export function profileToInput(p: Profile): ProfileInput {
  return {
    full_name: p.full_name,
    phone: p.phone ?? "",
    email: p.email ?? "",
    gender: p.gender ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    location_label: p.location_label ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timezone ?? "",
    birth_date: p.birth_date ? formatDateInput(p.birth_date) : "",
    birth_time: p.birth_time ? formatTimeInput(p.birth_time) : "",
    birth_era: p.birth_era ?? "bs",
    is_default: p.is_default,
  };
}

/** A birth place picked in either app's place search. */
export type ProfilePlace = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  location_label: string;
};

const GENDERS: { value: string; label: string }[] = [
  { value: "male", label: "profile.male" },
  { value: "female", label: "profile.female" },
  { value: "other", label: "profile.other" },
];

const ERAS: { value: string; label: string }[] = [
  { value: "bs", label: "profile.calendar_bs" },
  { value: "ad", label: "profile.calendar_ad" },
];

export function useProfileForm({
  initial,
  existing,
  onSaved,
  afterSave,
}: {
  initial: ProfileInput;
  existing?: Profile;
  onSaved: (saved: Profile) => void;
  /** Platform follow-up once a profile is stored (the app reschedules its reminders). */
  afterSave?: (isNew: boolean) => void;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<ProfileInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileInput>(key: K, val: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function selectPlace(sel: ProfilePlace) {
    setForm((f) => ({
      ...f,
      city: sel.city,
      country: sel.country,
      latitude: sel.latitude,
      longitude: sel.longitude,
      timezone: sel.timezone,
      location_label: sel.location_label,
    }));
  }

  /** A place known only by its "City, …, Country" label and coordinates. */
  function selectPlaceByLabel(label: string, lat: number | undefined, lon: number | undefined, timezone?: string) {
    const parts = label.split(",").map((s) => s.trim());
    setForm((f) => ({
      ...f,
      city: parts[0] ?? f.city,
      country: parts.length > 1 ? parts[parts.length - 1] : f.country,
      location_label: label,
      latitude: lat,
      longitude: lon,
      timezone: timezone ?? f.timezone,
    }));
  }

  async function submit() {
    if (!form.full_name.trim()) {
      setError(t("profile.name_required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Drop empty strings so optional fields stay null on the server.
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])) as ProfileInput;
      payload.full_name = form.full_name.trim();
      const saved = existing ? await updateProfile(existing.id, payload) : await createProfile(payload);
      afterSave?.(!existing);
      onSaved(saved);
    } catch {
      setError(t("profile.save_failed"));
    } finally {
      setBusy(false);
    }
  }

  const gender = form.gender ?? "";
  const era = form.birth_era ?? "bs";

  return {
    form,
    set,
    setName: (v: string) => set("full_name", v),
    setPhone: (v: string) => set("phone", v),
    setEmail: (v: string) => set("email", v),
    setGender: (v: string) => set("gender", v),
    setBirthDate: (v: string) => set("birth_date", formatDateInput(v)),
    setBirthTime: (v: string) => set("birth_time", formatTimeInput(v)),
    setEra: (v: string) => set("birth_era", v),
    setDefault: (v: boolean) => set("is_default", v),
    selectPlace,
    selectPlaceByLabel,
    /** What the place search shows. */
    placeValue: form.location_label || form.city || "",
    /** "Country · Timezone" under the place search, once a place is picked. */
    placeHint: form.country ? `${form.country}${form.timezone ? ` · ${form.timezone}` : ""}` : null,
    genders: GENDERS.map((g) => ({ value: g.value, label: t(g.label), active: gender === g.value, select: () => set("gender", g.value) })),
    eras: ERAS.map((e) => ({ value: e.value, label: t(e.label), active: era === e.value, select: () => set("birth_era", e.value) })),
    busy,
    error,
    submit,
    copy: {
      fullName: t("profile.full_name"),
      phone: t("profile.phone"),
      phonePlaceholder: "+977…",
      email: t("profile.email"),
      emailPlaceholder: t("auth.email_placeholder"),
      gender: t("profile.gender"),
      birthPlace: t("profile.city_birth_place"),
      birthDate: t("profile.birth_date"),
      birthDatePlaceholder: t("ui.auth.yyyy_mm_dd"),
      birthTime: t("profile.birth_time"),
      birthTimePlaceholder: t("ui.auth.hh_mm"),
      calendar: t("profile.calendar"),
      setDefault: t("profile.set_default"),
      cancel: t("common.cancel"),
      submit: busy ? t("common.saving") : existing ? t("profile.save_changes") : t("profile.create_profile"),
    },
  };
}
