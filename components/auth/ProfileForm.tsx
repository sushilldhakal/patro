import { useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { Button } from "@/components/ui/Button";
import { EmailTextInput } from "@/components/ui/EmailTextInput";
import { formatDateInput, formatTimeInput } from "@/lib/birth-date";
import { afterProfileSaved } from "@/lib/notifications/triggers";
import {
  createProfile,
  updateProfile,
  type Profile,
  type ProfileInput,
} from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  DEFAULT_PANCHANGA_LOCATION,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

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

function inputToLocation(form: ProfileInput): PanchangaLocation {
  if (form.latitude != null && form.longitude != null) {
    return {
      label: form.location_label || form.city || pickLabel(form),
      params: {
        lat: form.latitude,
        lon: form.longitude,
        ...(form.timezone ? { timezone: form.timezone } : {}),
      },
    };
  }
  return DEFAULT_PANCHANGA_LOCATION;
}

function pickLabel(form: ProfileInput): string {
  return form.location_label || form.city || "जन्म स्थान";
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
      {children}
    </Text>
  );
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  maxLength?: number;
}) {
  const colors = useThemeColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={keyboardType}
      maxLength={maxLength}
      className="text-body rounded-lg border border-border bg-card px-3 py-2.5 text-foreground"
      style={nepaliTextStyle(14)}
    />
  );
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-lg border px-3 py-2",
        active ? "border-secondary bg-secondary/10" : "border-border bg-card",
      )}
    >
      <Text
        className={cn("text-body", active ? "font-semibold text-secondary" : "text-foreground")}
        style={nepaliTextStyle(14)}
      >
        {label}
      </Text>
    </Pressable>
  );
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
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const [form, setForm] = useState<ProfileInput>(initial);
  const [birthLocation, setBirthLocation] = useState<PanchangaLocation>(() => inputToLocation(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileInput>(key: K, val: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onLocationChange(loc: PanchangaLocation) {
    setBirthLocation(loc);
    const parts = loc.label.split(",").map((s) => s.trim());
    setForm((f) => ({
      ...f,
      city: parts[0] ?? f.city,
      country: parts.length > 1 ? parts[parts.length - 1] : f.country,
      location_label: loc.label,
      latitude: loc.params.lat,
      longitude: loc.params.lon,
      timezone: loc.params.timezone ?? f.timezone,
    }));
  }

  async function onSubmit() {
    if (!form.full_name.trim()) {
      setError(pick("नाम अनिवार्य छ", "Name is required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      ) as ProfileInput;
      payload.full_name = form.full_name.trim();
      const saved = existing
        ? await updateProfile(existing.id, payload)
        : await createProfile(payload);
      void afterProfileSaved(lang === "en" ? "en" : "ne", !existing);
      onSaved(saved);
    } catch {
      setError(pick("प्रोफाइल सेभ गर्न सकिएन", "Could not save profile"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-4">
      <View className="gap-4 sm:flex-row">
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("पूरा नाम", "Full name")}</FieldLabel>
          <FieldInput value={form.full_name} onChangeText={(v) => set("full_name", v)} />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("फोन", "Phone")}</FieldLabel>
          <FieldInput
            value={form.phone ?? ""}
            onChangeText={(v) => set("phone", v)}
            placeholder="+977…"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View className="gap-4 sm:flex-row">
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("इमेल", "Email")}</FieldLabel>
          <EmailTextInput
            value={form.email ?? ""}
            onChangeText={(v) => set("email", v)}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            className="text-body rounded-lg border border-border bg-card px-3 py-2.5 text-foreground"
            style={nepaliTextStyle(14)}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("लिङ्ग", "Gender")}</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            <OptionChip
              label={pick("पुरुष", "Male")}
              active={form.gender === "male"}
              onPress={() => set("gender", "male")}
            />
            <OptionChip
              label={pick("महिला", "Female")}
              active={form.gender === "female"}
              onPress={() => set("gender", "female")}
            />
            <OptionChip
              label={pick("अन्य", "Other")}
              active={form.gender === "other"}
              onPress={() => set("gender", "other")}
            />
          </View>
        </View>
      </View>

      <View className="gap-1.5">
        <FieldLabel>{pick("जन्म स्थान", "Birth place")}</FieldLabel>
        <LocationSelector location={birthLocation} onLocationChange={onLocationChange} />
        {form.country ? (
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
            {form.country}
            {form.timezone ? ` · ${form.timezone}` : ""}
          </Text>
        ) : null}
      </View>

      <View className="gap-4 sm:flex-row">
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("जन्म मिति", "Birth date")}</FieldLabel>
          <FieldInput
            value={form.birth_date ?? ""}
            onChangeText={(v) => set("birth_date", formatDateInput(v))}
            placeholder={pick("वर्ष-महिना-दिन", "YYYY-MM-DD")}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("जन्म समय", "Birth time")}</FieldLabel>
          <FieldInput
            value={form.birth_time ?? ""}
            onChangeText={(v) => set("birth_time", formatTimeInput(v))}
            placeholder={pick("घण्टा:मिनेट", "HH:MM")}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <FieldLabel>{pick("पात्रो", "Calendar")}</FieldLabel>
          <View className="flex-row gap-2">
            <OptionChip
              label={pick("वि.सं.", "BS")}
              active={(form.birth_era ?? "bs") === "bs"}
              onPress={() => set("birth_era", "bs")}
            />
            <OptionChip
              label={pick("ई.सं.", "AD")}
              active={form.birth_era === "ad"}
              onPress={() => set("birth_era", "ad")}
            />
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <Switch value={!!form.is_default} onValueChange={(v) => set("is_default", v)} />
        <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
          {pick("पूर्वनिर्धारित प्रोफाइल", "Set as default profile")}
        </Text>
      </View>

      {error ? (
        <Text className="text-body text-destructive" style={nepaliTextStyle(14)}>
          {error}
        </Text>
      ) : null}

      <View className="flex-row justify-end gap-2">
        <Button label={pick("रद्द", "Cancel")} variant="ghost" onPress={onCancel} disabled={busy} />
        <Button
          label={
            busy
              ? pick("सेभ हुँदै…", "Saving…")
              : existing
                ? pick("परिवर्तन सेभ", "Save changes")
                : pick("प्रोफाइल बनाउनुहोस्", "Create profile")
          }
          onPress={onSubmit}
          disabled={busy}
        />
      </View>
    </View>
  );
}
