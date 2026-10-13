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
import { cn } from "@vedic-patro/domain/utils";
import { space } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const PROFILE_GRID_GUTTER = 6;

function profileGridColumns(width: number): number {
  if (width >= BREAKPOINTS.lg) return 3;
  if (width >= BREAKPOINTS.sm) return 2;
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
  const { t, pick } = useLocale();
  const { width } = useBreakpoint();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading, isError } = useProfilesQuery();
  const [dialog, setDialog] = useState<DialogState>(null);
  const profileCols = profileGridColumns(width);

  useImperativeHandle(ref, () => ({ openAdd: () => setDialog({ mode: "add" }) }), []);

  if (isLoading && !profiles) {
    return (
      <View className={kundaliDetailClasses.milanPicker.loadingBox}>
        <ActivityIndicator />
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(14)}>
          {t("ui.kundali.loading_profiles")}
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <Text className={cn(kundaliDetailClasses.milanPicker.errorBox, kundaliDetailClasses.milanPicker.errorText)}>
        {t("ui.kundali.could_not_load_profiles")}
      </Text>
    );
  }

  const list = profiles ?? [];

  return (
    <>
      {list.length === 0 ? (
        <View className={cn(kundaliDetailClasses.milanPicker.emptyBox, "items-center")}>
          <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
            {t("ui.kundali.no_profiles_yet")}
          </Text>
          <Text className="mt-1 max-w-md text-center text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.kundali.save_birth_details_once_then_generate")}
          </Text>
          <View className="mt-4">
            <Button
              label={t("ui.kundali.add_first_profile")}
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
                marginBottom: space.md,
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
            ? t("ui.kundali.edit_profile")
            : t("kundali.add_profile")
        }
        subtitle={t("ui.common.enter_accurate_birth_date_time_and")}
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
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const place = p.location_label || p.city || "—";
  const dob = p.birth_date ? `${p.birth_date} ${(p.birth_era ?? "bs").toUpperCase()}` : "—";
  const latLon =
    p.latitude != null && p.longitude != null
      ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
      : "—";
  const genderLabel =
    p.gender === "male"
      ? t("profile.male")
      : p.gender === "female"
        ? t("profile.female")
        : p.gender === "other"
          ? t("profile.other")
          : null;

  return (
    <Card
      className={cn("w-full gap-3", active ? kundaliDetailClasses.profilePicker.cardActive : undefined)}
    >
      <View className={kundaliDetailClasses.profilePicker.head}>
        <View className="min-w-0 flex-1">
          <View className={kundaliDetailClasses.profilePicker.nameRow}>
            <Text className={cn("text-base", kundaliDetailClasses.profilePicker.nameText)} style={nepaliTextStyle(16)} numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.is_default ? (
              <Ionicons name="star" size={14} color={colors.secondary} />
            ) : null}
          </View>
          {genderLabel ? (
            <Text className={kundaliDetailClasses.profilePicker.gender} style={nepaliTextStyle(12)}>
              {genderLabel}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onEdit} className="rounded-lg p-2 active:bg-muted">
          <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View className={kundaliDetailClasses.profilePicker.rows}>
        <DetailRow
          icon="time-outline"
          label={t("kundali.dob")}
          value={`${dob}${p.birth_time ? ` · ${p.birth_time}` : ""}`}
        />
        <DetailRow icon="location-outline" label={t("kundali.place")} value={place} />
        <DetailRow icon="navigate-outline" label={t("ui.kundali.lat_lon")} value={latLon} />
        <DetailRow icon="globe-outline" label={t("kundali.timezone")} value={p.timezone || "—"} />
      </View>

      <Button
        label={active ? t("ui.kundali.viewing") : t("kundali.view_kundali")}
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
    <View className={kundaliDetailClasses.profilePicker.row}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} style={{ marginTop: space.hair }} />
      <Text className={kundaliDetailClasses.profilePicker.rowLabel} style={nepaliTextStyle(12)}>
        {label}:
      </Text>
      <Text className={cn(kundaliDetailClasses.profilePicker.rowValue, "flex-1")} style={nepaliTextStyle(12)}>
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
  const { t, pick } = useLocale();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-sm text-foreground">{t("common.cancel")}</Text>
          </Pressable>
          <View className="min-w-0 flex-1 px-3">
            <Text className="text-center text-lg font-semibold tracking-tight text-foreground" style={nepaliTextStyle(16)}>
              {title}
            </Text>
            <Text className="text-center text-sm text-foreground" style={nepaliTextStyle(12)}>
              {subtitle}
            </Text>
          </View>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView
          contentContainerStyle={{
            padding: space.lg,
            paddingBottom: Math.max(insets.bottom, space.lg),
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
