import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import type { Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { formatProfileBirthLabel } from "@vedic-patro/domain/kundali/profile-chart";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/domain/utils";

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

type Props = {
  profile: Profile;
  birthDateLabel: string;
  birthTime: string;
  place: string;
};

export function KundaliProfileHeader({ profile, birthDateLabel, birthTime, place }: Props) {
  const { t } = useLocale();
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
              {t("ui.kundali.birth_chart")}
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
          items={[
            {
              icon: "calendar-outline" as const,
              label: t("kundali.birth_date"),
              value: birthDateLabel,
            },
            {
              icon: "time-outline" as const,
              label: t("common.time"),
              value: birthTime,
              mono: true,
            },
            {
              icon: "location-outline" as const,
              label: t("kundali.place"),
              value: place,
            },
            {
              icon: "globe-outline" as const,
              label: t("kundali.timezone"),
              value: profile.timezone || "—",
              mono: true,
            },
          ]}
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

export function formatProfileBirthDateLabel(
  profile: Profile,
  _birthDate: Date | null,
  lang: string,
  digits: (v: string | number) => string,
): string {
  return formatProfileBirthLabel(profile, lang, digits);
}
