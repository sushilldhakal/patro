import {
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
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
import { useKundaliProfilePicker } from "@vedic-patro/features/kundali";
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

type Picker = ReturnType<typeof useKundaliProfilePicker>;

export const KundaliProfilePicker = forwardRef<
  KundaliProfilePickerHandle,
  { selectedId?: string | null; onSelect: (profile: Profile) => void }
>(function KundaliProfilePicker({ selectedId, onSelect }, ref) {
  const { width } = useBreakpoint();
  const picker = useKundaliProfilePicker({ selectedId, onSelect });
  const { openAdd } = picker;
  const profileCols = profileGridColumns(width);

  useImperativeHandle(ref, () => ({ openAdd }), [openAdd]);

  if (picker.status === "loading") {
    return (
      <View className={kundaliDetailClasses.milanPicker.loadingBox}>
        <ActivityIndicator />
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(14)}>
          {picker.loadingText}
        </Text>
      </View>
    );
  }

  if (picker.status === "error") {
    return (
      <Text className={cn(kundaliDetailClasses.milanPicker.errorBox, kundaliDetailClasses.milanPicker.errorText)}>
        {picker.errorText}
      </Text>
    );
  }

  return (
    <>
      {picker.cards.length === 0 ? (
        <View className={cn(kundaliDetailClasses.milanPicker.emptyBox, "items-center")}>
          <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
            {picker.empty.title}
          </Text>
          <Text className="mt-1 max-w-md text-center text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {picker.empty.hint}
          </Text>
          <View className="mt-4">
            <Button label={picker.empty.action} onPress={picker.openAdd} />
          </View>
        </View>
      ) : (
        <View
          className="flex-row flex-wrap"
          style={{ marginHorizontal: -PROFILE_GRID_GUTTER }}
        >
          {picker.cards.map((c) => (
            <View
              key={c.id}
              style={{
                width: `${100 / profileCols}%`,
                paddingHorizontal: PROFILE_GRID_GUTTER,
                marginBottom: space.md,
              }}
            >
              <ProfileCard card={c} editLabel={picker.editLabel} />
            </View>
          ))}
        </View>
      )}

      <ProfileFormModal
        open={picker.dialogOpen}
        title={picker.dialogTitle}
        subtitle={picker.dialogHint}
        onClose={picker.closeDialog}
      >
        {picker.dialog ? (
          <ProfileForm
            initial={picker.dialog.existing ? profileToInput(picker.dialog.existing) : EMPTY_PROFILE}
            existing={picker.dialog.existing}
            onCancel={picker.closeDialog}
            onSaved={picker.dialog.onSaved}
          />
        ) : null}
      </ProfileFormModal>
    </>
  );
});

function ProfileCard({ card: c, editLabel }: { card: Picker["cards"][number]; editLabel: string }) {
  const colors = useThemeColors();

  return (
    <Card
      className={cn("w-full gap-3", c.active ? kundaliDetailClasses.profilePicker.cardActive : undefined)}
    >
      <View className={kundaliDetailClasses.profilePicker.head}>
        <View className="min-w-0 flex-1">
          <View className={kundaliDetailClasses.profilePicker.nameRow}>
            <Text className={cn("text-base", kundaliDetailClasses.profilePicker.nameText)} style={nepaliTextStyle(16)} numberOfLines={1}>
              {c.name}
            </Text>
            {c.isDefault ? (
              <Ionicons name="star" size={14} color={colors.secondary} />
            ) : null}
          </View>
          {c.gender ? (
            <Text className={kundaliDetailClasses.profilePicker.gender} style={nepaliTextStyle(12)}>
              {c.gender}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={c.edit} accessibilityLabel={editLabel} className="rounded-lg p-2 active:bg-muted">
          <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View className={kundaliDetailClasses.profilePicker.rows}>
        <DetailRow icon="time-outline" label={c.rows.dob.label} value={c.rows.dob.value} />
        <DetailRow icon="location-outline" label={c.rows.place.label} value={c.rows.place.value} />
        <DetailRow icon="navigate-outline" label={c.rows.latLon.label} value={c.rows.latLon.value} />
        <DetailRow icon="globe-outline" label={c.rows.timezone.label} value={c.rows.timezone.value} />
      </View>

      <Button
        label={c.viewLabel}
        variant={c.active ? "default" : "outline"}
        size="sm"
        onPress={c.view}
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
  const { t } = useLocale();

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
