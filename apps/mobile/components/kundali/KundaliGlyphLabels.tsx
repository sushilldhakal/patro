import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

export function isGrahaKey(key: string): key is GrahaKey {
  return key !== "lagna" && key in GRAHA_NAME;
}

export function GrahaInline({
  grahaKey,
  label,
  size = 20,
  textSize = 12,
}: {
  grahaKey: string;
  label: string;
  size?: number;
  textSize?: number;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      {isGrahaKey(grahaKey) ? <GrahaPlanetIcon graha={grahaKey} size={size} /> : null}
      <Text className="text-foreground" style={nepaliTextStyle(textSize)} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function GrahaInlineChildren({
  grahaKey,
  size = 20,
  children,
}: {
  grahaKey: string;
  size?: number;
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      {isGrahaKey(grahaKey) ? <GrahaPlanetIcon graha={grahaKey} size={size} /> : null}
      {children}
    </View>
  );
}

export function GrahaKeysRow({
  keys,
  lang,
  nameForKey,
  size = 16,
  textSize = 11,
}: {
  keys: string[];
  lang: "ne" | "en";
  nameForKey: (key: string) => string;
  size?: number;
  textSize?: number;
}) {
  if (keys.length === 0) {
    return (
      <Text className="text-foreground" style={nepaliTextStyle(textSize)}>
        —
      </Text>
    );
  }
  return (
    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
      {keys.map((key, i) => (
        <View key={`${key}-${i}`} className="flex-row items-center gap-1">
          {isGrahaKey(key) ? <GrahaPlanetIcon graha={key} size={size} /> : null}
          <Text className="text-foreground" style={nepaliTextStyle(textSize)}>
            {nameForKey(key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function RashiInline({
  rashiNum,
  lang,
  nameNe,
  size = 18,
  textSize = 11,
}: {
  rashiNum: number;
  lang: "ne" | "en";
  nameNe?: string;
  size?: number;
  textSize?: number;
}) {
  const label = formatRashiByNumber(rashiNum, lang);
  return (
    <View className="flex-row items-center gap-1.5">
      <RashiGlyphIcon name={nameNe} number={rashiNum} size={size} />
      <Text className="text-foreground" style={nepaliTextStyle(textSize)}>
        {label}
      </Text>
    </View>
  );
}

export function NakshatraInline({
  index,
  lang,
  pada,
  digits,
  size = 18,
  textSize = 11,
}: {
  index: number;
  lang: "ne" | "en";
  pada?: number | string;
  digits: (v: string | number) => string;
  size?: number;
  textSize?: number;
}) {
  const icon = NAKSHATRA_ICONS[index];
  const name = lang === "en" ? icon?.en ?? "—" : icon?.ne ?? "—";
  return (
    <View className="flex-row items-center gap-1.5">
      <NakshatraGlyphIcon name={icon?.ne} number={index + 1} size={size} />
      <Text className="text-foreground" style={nepaliTextStyle(textSize)} numberOfLines={1}>
        {name}
        {pada != null ? ` · ${digits(pada)}` : ""}
      </Text>
    </View>
  );
}
