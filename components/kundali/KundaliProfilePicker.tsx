import {
  forwardRef,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EMPTY_PROFILE,
  ProfileForm,
  profileToInput,
} from "@/components/auth/ProfileForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { type Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const PROFILE_GRID_GUTTER = 6;

function profileGridColumns(width: number): number {
  if (width >= BREAKPOINTS.md) return 3;
  return 1;
}

export interface KundaliProfilePickerHandle {
  openAdd: () => void;
}

type DialogState = { mode: "add" } | { mode: "edit"; profile: Profile } | null;

export const KundaliProfilePicker = forwardRef<
  KundaliProfilePickerHandle,
  { selectedId?: string | null; onSelect: (profile: Profile) => void }
>(function KundaliProfilePicker({ selectedId, onSelect }, ref) {
  const { pick } = useLocale();
  const { width } = useBreakpoint();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading, isError } = useProfilesQuery();
  const [dialog, setDialog] = useState<DialogState>(null);
  const profileCols = profileGridColumns(width);

  useImperativeHandle(ref, () => ({ openAdd: () => setDialog({ mode: "add" }) }), []);

  if (isLoading && !profiles) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-6">
        <ActivityIndicator />
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("प्रोफाइल लोड हुँदै…", "Loading profiles…")}
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <Text className="text-body rounded-xl border border-border bg-card px-4 py-4 text-destructive">
        {pick("प्रोफाइल लोड गर्न सकिएन", "Could not load profiles")}
      </Text>
    );
  }

  const list = profiles ?? [];

  return (
    <>
      {list.length === 0 ? (
        <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10">
          <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
            {pick("अहिले कुनै प्रोफाइल छैन", "No profiles yet")}
          </Text>
          <Text className="text-body mt-1 max-w-md text-center text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick(
              "जन्म विवरण सेभ गर्नुहोस् — पछि कुण्डली छिटो बनाउन सकिन्छ।",
              "Save birth details once, then generate kundali quickly.",
            )}
          </Text>
          <View className="mt-4">
            <Button
              label={pick("पहिलो प्रोफाइल थप्नुहोस्", "Add first profile")}
              onPress={() => setDialog({ mode: "add" })}
            />
          </View>
        </View>
      ) : (
        <View
          className="flex-row flex-wrap"
          style={{ marginHorizontal: -PROFILE_GRID_GUTTER }}
        >
          {list.map((p) => (
            <View
              key={p.id}
              style={{
                width: `${100 / profileCols}%`,
                paddingHorizontal: PROFILE_GRID_GUTTER,
                marginBottom: 12,
              }}
            >
              <ProfileCard
                profile={p}
                active={p.id === selectedId}
                onView={() => onSelect(p)}
                onEdit={() => setDialog({ mode: "edit", profile: p })}
              />
            </View>
          ))}
        </View>
      )}

      <ProfileFormModal
        open={dialog !== null}
        title={
          dialog?.mode === "edit"
            ? pick("प्रोफाइल सम्पादन", "Edit profile")
            : pick("प्रोफाइल थप्नुहोस्", "Add profile")
        }
        subtitle={pick(
          "जन्म मिति, समय र स्थान सही राख्नुहोस्।",
          "Enter accurate birth date, time, and place.",
        )}
        onClose={() => setDialog(null)}
      >
        {dialog ? (
          <ProfileForm
            initial={dialog.mode === "edit" ? profileToInput(dialog.profile) : EMPTY_PROFILE}
            existing={dialog.mode === "edit" ? dialog.profile : undefined}
            onCancel={() => setDialog(null)}
            onSaved={async (saved) => {
              const wasEditingSelected =
                dialog.mode === "edit" && dialog.profile.id === selectedId;
              setDialog(null);
              await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
              if (dialog.mode === "add" || wasEditingSelected) onSelect(saved);
            }}
          />
        ) : null}
      </ProfileFormModal>
    </>
  );
});

function ProfileCard({
  profile: p,
  active,
  onView,
  onEdit,
}: {
  profile: Profile;
  active: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const place = p.location_label || p.city || "—";
  const dob = p.birth_date ? `${p.birth_date} ${(p.birth_era ?? "bs").toUpperCase()}` : "—";
  const latLon =
    p.latitude != null && p.longitude != null
      ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
      : "—";
  const genderLabel =
    p.gender === "male"
      ? pick("पुरुष", "Male")
      : p.gender === "female"
        ? pick("महिला", "Female")
        : p.gender === "other"
          ? pick("अन्य", "Other")
          : null;

  return (
    <Card
      className={cn("w-full gap-2.5 p-3", active ? "border-secondary bg-secondary/5" : undefined)}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-semibold text-foreground" style={nepaliTextStyle(16)} numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.is_default ? (
              <Ionicons name="star" size={14} color={colors.secondary} />
            ) : null}
          </View>
          {genderLabel ? (
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {genderLabel}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onEdit} className="rounded-lg p-2 active:bg-muted">
          <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View className="gap-1.5">
        <DetailRow
          icon="time-outline"
          label={pick("जन्म मिति", "DOB")}
          value={`${dob}${p.birth_time ? ` · ${p.birth_time}` : ""}`}
        />
        <DetailRow icon="location-outline" label={pick("स्थान", "Place")} value={place} />
        <DetailRow icon="navigate-outline" label={pick("अक्षांश/देशान्तर", "Lat/Lon")} value={latLon} />
        <DetailRow icon="globe-outline" label={pick("समय क्षेत्र", "Timezone")} value={p.timezone || "—"} />
      </View>

      <Button
        label={active ? pick("हेर्दै", "Viewing") : pick("कुण्डली हेर्नुहोस्", "View kundali")}
        variant={active ? "default" : "outline"}
        size="sm"
        onPress={onView}
        className="mt-auto"
      />
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start gap-1.5">
      <Ionicons name={icon} size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      <Text className="text-caption shrink-0 text-muted-foreground" style={nepaliTextStyle(12)}>
        {label}:
      </Text>
      <Text className="text-caption min-w-0 flex-1 text-foreground" style={nepaliTextStyle(12)}>
        {value}
      </Text>
    </View>
  );
}

export function ProfileFormModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { pick } = useLocale();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-body text-muted-foreground">{pick("रद्द", "Cancel")}</Text>
          </Pressable>
          <View className="min-w-0 flex-1 px-3">
            <Text className="text-body text-center font-semibold text-foreground" style={nepaliTextStyle(16)}>
              {title}
            </Text>
            <Text className="text-caption text-center text-muted-foreground" style={nepaliTextStyle(12)}>
              {subtitle}
            </Text>
          </View>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
