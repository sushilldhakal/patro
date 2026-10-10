import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import type { Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { formatProfileBirthLabel } from "@vedic-patro/domain/kundali/profile-chart";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

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
    <View className="min-w-[6.75rem] justify-center px-2.5 py-2 sm:px-3">
      <View className="mb-0.5 flex-row items-center gap-1">
        <Ionicons name={icon} size={10} color={colors.mutedForeground} />
        <Text
          className="text-caption font-semibold uppercase tracking-wider text-muted-foreground"
          style={nepaliTextStyle(10)}
        >
          {label}
        </Text>
      </View>
      <Text
        className={mono ? "text-caption font-num font-semibold text-foreground" : "text-body font-semibold text-foreground"}
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
  const { pick } = useLocale();
  const colors = useThemeColors();

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <View className="flex-col lg:flex-row">
        <View className="flex-row items-center gap-2.5 border-b border-border px-3 py-2.5 sm:px-4 lg:flex-1 lg:border-b-0 lg:border-r">
          <View
            style={{ backgroundColor: `${colors.secondary}26` }}
            className="size-9 shrink-0 items-center justify-center rounded-xl sm:size-10"
          >
            <Ionicons name="person-outline" size={18} color={colors.secondary} />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-caption mb-0.5 font-semibold uppercase tracking-wider text-muted-foreground"
              style={nepaliTextStyle(12)}
            >
              {pick("जन्मकुण्डली", "Birth chart")}
            </Text>
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
                {profile.full_name}
              </Text>
              {profile.is_default ? (
                <Ionicons name="star" size={14} color={colors.secondary} />
              ) : null}
            </View>
            {profile.gender ? (
              <Text className="text-body mt-0.5 capitalize text-muted-foreground" style={nepaliTextStyle(13)}>
                {profile.gender}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollViewMetaRow
          items={[
            {
              icon: "calendar-outline" as const,
              label: pick("जन्म मिति", "Birth date"),
              value: birthDateLabel,
            },
            {
              icon: "time-outline" as const,
              label: pick("समय", "Time"),
              value: birthTime,
              mono: true,
            },
            {
              icon: "location-outline" as const,
              label: pick("स्थान", "Place"),
              value: place,
            },
            {
              icon: "globe-outline" as const,
              label: pick("समय क्षेत्र", "Timezone"),
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
