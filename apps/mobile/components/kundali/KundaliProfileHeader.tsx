import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import type { Profile } from "@/lib/auth/client";
import type { KundaliMetaItem } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

function MetaItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className={cn(kundaliClasses.metaItem, "min-w-[6.75rem] sm:min-w-[7.25rem]")}>
      <View className={cn(kundaliClasses.metaLabelRow, "mb-0.5")}>
        <Ionicons name={icon} size={10} color={colors.mutedForeground} />
        <Text
          className={kundaliClasses.metaLabel}
          style={nepaliTextStyle(10)}
        >
          {label}
        </Text>
      </View>
      <Text
        className={mono ? kundaliClasses.metaValueMono : kundaliClasses.metaValue}
        style={nepaliTextStyle(mono ? 12 : 14)}
      >
        {value}
      </Text>
    </View>
  );
}

const META_ICONS: Record<KundaliMetaItem["key"], keyof typeof Ionicons.glyphMap> = {
  birthDate: "calendar-outline",
  time: "time-outline",
  place: "location-outline",
  timezone: "globe-outline",
};

type Props = {
  profile: Profile;
  eyebrow: string;
  meta: KundaliMetaItem[];
};

export function KundaliProfileHeader({ profile, eyebrow, meta }: Props) {
  const colors = useThemeColors();

  return (
    <View className={cn(kundaliClasses.profileHeader, "mb-4")}>
      <View className="flex-col lg:flex-row">
        <View className={cn(kundaliClasses.profileIdentity, "border-b border-border lg:flex-1 lg:border-b-0 lg:border-r")}>
          <View className={kundaliClasses.profileAvatar}>
            <Ionicons name="person-outline" size={18} color={colors.secondary} />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className={kundaliClasses.profileEyebrow}
              style={nepaliTextStyle(12)}
            >
              {eyebrow}
            </Text>
            <View className={kundaliClasses.profileNameRow}>
              <Text className={kundaliClasses.profileName} style={nepaliTextStyle(18)}>
                {profile.full_name}
              </Text>
              {profile.is_default ? (
                <Ionicons name="star" size={14} color={colors.secondary} />
              ) : null}
            </View>
            {profile.gender ? (
              <Text className={kundaliClasses.profileGender} style={nepaliTextStyle(13)}>
                {profile.gender}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollViewMetaRow
          items={meta.map((item) => ({ icon: META_ICONS[item.key], label: item.label, value: item.value, mono: item.mono }))}
        />
      </View>
    </View>
  );
}

function ScrollViewMetaRow({
  items,
}: {
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    mono?: boolean;
  }[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-1 border-t border-border lg:border-t-0"
      contentContainerStyle={{ flexDirection: "row" }}
    >
      {items.map((item, i) => (
        <View
          key={item.label}
          className={i > 0 ? "border-l border-border" : undefined}
        >
          <MetaItem {...item} />
        </View>
      ))}
    </ScrollView>
  );
}
