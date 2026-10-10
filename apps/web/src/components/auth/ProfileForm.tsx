import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityAutocomplete } from "@/components/auth/CityAutocomplete";
import { formatDateInput, formatTimeInput } from "@/lib/birth-date";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  createProfile,
  updateProfile,
  type Profile,
  type ProfileInput,
} from "@/lib/auth/client";

const labelClass = "text-sm text-base text-foreground";
const fieldWrap = "flex flex-col gap-1.5";

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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [form, setForm] = useState<ProfileInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileInput>(key: K, val: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError(t("profile.name_required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Drop empty strings so optional fields stay null on the server.
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
      ) as ProfileInput;
      payload.full_name = form.full_name.trim();
      const saved = existing
        ? await updateProfile(existing.id, payload)
        : await createProfile(payload);
      onSaved(saved);
    } catch {
      setError(t("profile.save_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.full_name")}</label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.phone")}</label>
          <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+977…" />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.email")}</label>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.gender")}</label>
          <select
            value={form.gender ?? ""}
            onChange={(e) => set("gender", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">—</option>
            <option value="male">{t("profile.male")}</option>
            <option value="female">{t("profile.female")}</option>
            <option value="other">{t("profile.other")}</option>
          </select>
        </div>
      </div>

      <div className={fieldWrap}>
        <label className={labelClass}>{t("profile.city_birth_place")}</label>
        <CityAutocomplete
          value={form.location_label || form.city}
          onSelect={(sel) =>
            setForm((f) => ({
              ...f,
              city: sel.city,
              country: sel.country,
              latitude: sel.latitude,
              longitude: sel.longitude,
              timezone: sel.timezone,
              location_label: sel.location_label,
            }))
          }
        />
        {form.country && (
          <p className="text-xs">
            {form.country}
            {form.timezone ? ` · ${form.timezone}` : ""}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.birth_date")}</label>
          <Input
            value={form.birth_date ?? ""}
            onChange={(e) => set("birth_date", formatDateInput(e.target.value))}
            placeholder={bilingualText(lang, "वर्ष-महिना-दिन", "YYYY-MM-DD")}
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.birth_time")}</label>
          <Input
            value={form.birth_time ?? ""}
            onChange={(e) => set("birth_time", formatTimeInput(e.target.value))}
            placeholder={bilingualText(lang, "घण्टा:मिनेट", "HH:MM")}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{t("profile.calendar")}</label>
          <select
            value={form.birth_era ?? "bs"}
            onChange={(e) => set("birth_era", e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="bs">{t("profile.calendar_bs")}</option>
            <option value="ad">{t("profile.calendar_ad")}</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
          className="size-4 accent-[var(--secondary)]"
        />
        {t("profile.set_default")}
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy
            ? t("common.saving")
            : existing
              ? t("profile.save_changes")
              : t("profile.create_profile")}
        </Button>
      </div>
    </form>
  );
}
