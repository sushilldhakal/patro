import { useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { Button } from "@/components/ui/Button";
import { EmailTextInput } from "@/components/ui/EmailTextInput";
import { afterProfileSaved } from "@/lib/notifications/triggers";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { useProfileForm } from "@vedic-patro/features/account";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  DEFAULT_PANCHANGA_LOCATION,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

export { EMPTY_PROFILE, profileToInput } from "@vedic-patro/features/account";

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
  return form.location_label || form.city || tFor("ne", "ui.auth.birth_place");
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className={accountClasses.label} style={nepaliTextStyle(14)}>
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
      className={accountClasses.input}
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
        "h-8 items-center justify-center rounded-lg border px-2.5",
        active ? "border-secondary bg-secondary/10" : "border-border",
      )}
    >
      <Text
        className={cn("text-sm", active ? "font-semibold text-secondary" : "text-foreground")}
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
  const { lang } = useLocale();
  const colors = useThemeColors();
  const f = useProfileForm({
    initial,
    existing,
    onSaved,
    afterSave: (isNew) => void afterProfileSaved(lang === "en" ? "en" : "ne", isNew),
  });
  const { form, copy } = f;
  const [birthLocation, setBirthLocation] = useState<PanchangaLocation>(() => inputToLocation(initial));

  function onLocationChange(loc: PanchangaLocation) {
    setBirthLocation(loc);
    f.selectPlaceByLabel(loc.label, loc.params.lat, loc.params.lon, loc.params.timezone);
  }

  return (
    <View className={accountClasses.profileForm}>
      <View className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.fullName}</FieldLabel>
          <FieldInput value={form.full_name} onChangeText={f.setName} />
        </View>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.phone}</FieldLabel>
          <FieldInput
            value={form.phone ?? ""}
            onChangeText={f.setPhone}
            placeholder={copy.phonePlaceholder}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.email}</FieldLabel>
          <EmailTextInput
            value={form.email ?? ""}
            onChangeText={f.setEmail}
            placeholder={copy.emailPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            className={accountClasses.input}
            style={nepaliTextStyle(14)}
          />
        </View>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.gender}</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {f.genders.map((g) => (
              <OptionChip key={g.value} label={g.label} active={g.active} onPress={g.select} />
            ))}
          </View>
        </View>
      </View>

      <View className={accountClasses.field}>
        <FieldLabel>{copy.birthPlace}</FieldLabel>
        <LocationSelector location={birthLocation} onLocationChange={onLocationChange} />
        {f.placeHint ? (
          <Text className={accountClasses.hint} style={nepaliTextStyle()}>
            {f.placeHint}
          </Text>
        ) : null}
      </View>

      <View className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.birthDate}</FieldLabel>
          <FieldInput
            value={form.birth_date ?? ""}
            onChangeText={f.setBirthDate}
            placeholder={copy.birthDatePlaceholder}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.birthTime}</FieldLabel>
          <FieldInput
            value={form.birth_time ?? ""}
            onChangeText={f.setBirthTime}
            placeholder={copy.birthTimePlaceholder}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View className={cn("min-w-0 flex-1", accountClasses.field)}>
          <FieldLabel>{copy.calendar}</FieldLabel>
          <View className="flex-row gap-2">
            {f.eras.map((era) => (
              <OptionChip key={era.value} label={era.label} active={era.active} onPress={era.select} />
            ))}
          </View>
        </View>
      </View>

      <View className={cn("flex-row", accountClasses.checkRow)}>
        <Switch value={!!form.is_default} onValueChange={f.setDefault} />
        <Text className={accountClasses.checkText} style={nepaliTextStyle()}>
          {copy.setDefault}
        </Text>
      </View>

      {f.error ? (
        <Text className={accountClasses.formError} style={nepaliTextStyle(14)}>
          {f.error}
        </Text>
      ) : null}

      <View className={cn("flex-row", accountClasses.formActions)}>
        <Button label={copy.cancel} variant="ghost" onPress={onCancel} disabled={f.busy} />
        <Button
          label={copy.submit}
          onPress={() => void f.submit()}
          disabled={f.busy}
        />
      </View>
    </View>
  );
}
