import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { NavataraTone, RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import {
  RASHIFAL_DOMAIN_ICON,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
} from "@/lib/rashifal-ui";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
};

function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <View className={cn("flex-row", rashifalClasses.stars)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)}
        />
      ))}
    </View>
  );
}

function LuckyRow({
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
    <View className={cn("w-[48%] flex-row", rashifalClasses.luckyCell)}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} />
      <Text className={cn("min-w-0 flex-1", rashifalClasses.luckyValue)} numberOfLines={1} style={nepaliTextStyle()}>
        {value}
      </Text>
    </View>
  );
}

export function RashifalSignCard({ sign, period }: Props) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  const ne = lang === "ne";
  const displayName = ne ? sign.name : `${sign.title_en} · ${sign.name}`;
  const prediction = ne ? sign.prediction_ne : sign.prediction_en;
  const luckyColor = ne ? sign.lucky_color_ne : sign.lucky_color_en;
  const luckyNumber = ne ? sign.lucky_number_ne : sign.lucky_number_en;
  const luckyDirection = ne ? sign.lucky_direction_ne : sign.lucky_direction_en;
  const remedy = ne ? sign.remedy_ne : sign.remedy_en;
  const grade = ne ? sign.grade_ne : sign.grade_en;
  const lord = sign.rashi_lord;
  const luckyTime = sign.lucky_time;
  const pct = sign.percent ?? 50;

  return (
    <View className={rashifalClasses.card}>
      <View className={cn("flex-row", rashifalClasses.header)}>
        <RashiGlyphIcon name={getRashiName(sign.id, lang)} number={sign.id} size={36} />
        <View className={rashifalClasses.headerBody}>
          <Text className={rashifalClasses.name} style={nepaliTextStyle()}>
            {displayName}
          </Text>
          <Text className={rashifalClasses.nameSub} style={nepaliTextStyle()}>
            {sign.syllables_ne}
          </Text>
        </View>
      </View>

      <View className={cn("flex-row", rashifalClasses.meter)}>
        <StarMeter stars={sign.stars ?? 3} tone={sign.tone} />
        <View className={rashifalClasses.meterTrack}>
          <View className={cn(rashifalClasses.meterFill, rashifalToneBar(sign.tone))} style={{ width: `${pct}%` }} />
        </View>
        <Text className={cn(rashifalClasses.percent, rashifalToneText(sign.tone))} style={nepaliTextStyle()}>
          {digits(pct)}%
        </Text>
      </View>

      {grade ? (
        <Text className={rashifalClasses.grade} style={nepaliTextStyle()}>
          {grade}
        </Text>
      ) : null}

      {sign.domains?.length ? (
        <View className={cn("flex-row flex-wrap", rashifalClasses.domains)}>
          {sign.domains.map((domain) => {
            const icon = RASHIFAL_DOMAIN_ICON[domain.key];
            const label = ne ? domain.label_ne : domain.label_en;
            return (
              <View key={domain.key} className={cn("mb-2 w-1/3 px-1", rashifalClasses.domain)}>
                <View className={cn("flex-row", rashifalClasses.domainHead)}>
                  <Ionicons name={icon} size={14} color={colors.mutedForeground} />
                  <Text className={cn("flex-1", rashifalClasses.domainLabel)} numberOfLines={1} style={nepaliTextStyle()}>
                    {label}
                  </Text>
                </View>
                <View className={rashifalClasses.domainTrack}>
                  <View
                    className={cn(rashifalClasses.meterFill, rashifalToneBar(domain.tone))}
                    style={{ width: `${domain.percent}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text className={rashifalClasses.prediction} style={nepaliTextStyle()}>
        {prediction}
      </Text>

      <View className={cn("flex-row flex-wrap justify-between", rashifalClasses.lucky)}>
        <LuckyRow icon="color-palette-outline" label="" value={luckyColor} />
        <LuckyRow icon="keypad-outline" label="" value={luckyNumber} />
        {luckyDirection ? <LuckyRow icon="compass-outline" label="" value={luckyDirection} /> : null}
        {luckyTime?.start_local_time_short ? (
          <LuckyRow
            icon="time-outline"
            label=""
            value={`${luckyTime.start_local_time_short}–${luckyTime.end_local_time_short ?? ""}`}
          />
        ) : null}
      </View>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        className={cn("flex-row active:opacity-80", rashifalClasses.whyButton)}
      >
        <Text className={rashifalClasses.whyLabel} style={nepaliTextStyle()}>
          {pick("किन यस्तो?", "Why this reading?")}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className={rashifalClasses.details}>
          {sign.components?.length ? (
            <View className={rashifalClasses.componentList}>
              {sign.components.map((component) => (
            <View key={component.key} className={cn("flex-row", rashifalClasses.componentRow)}>
              <Text className={rashifalClasses.componentLabel}>
                {ne ? component.label_ne : component.label_en}
              </Text>
              <Text className={rashifalClasses.componentNote}>
                {ne ? component.note_ne : component.note_en}
              </Text>
              <Text className={cn(rashifalClasses.componentValue, rashifalToneText(component.tone))}>
                {toNepaliDigits(component.percent, lang)}
              </Text>
            </View>
          ))}
            </View>
          ) : null}

          {sign.gochar?.length ? <RashifalGocharChips rows={sign.gochar} /> : null}

          {lord ? (
            <Text className={rashifalClasses.lordLine}>
              {pick(
                `${lord.lord_ne} · ${lord.house} · ${lord.sign_ne}`,
                `${lord.lord_en} · house ${lord.house} · ${lord.sign_en}`,
              )}
            </Text>
          ) : null}

          {period !== "daily" && sign.best_day && sign.weak_day ? (
            <Text className={rashifalClasses.footNote}>
              {pick(
                `उत्तम: ${sign.best_day.date_bs ?? sign.best_day.date_ad} · कमजोर: ${sign.weak_day.date_bs ?? sign.weak_day.date_ad}`,
                `Best: ${sign.best_day.date_ad} · Weak: ${sign.weak_day.date_ad}`,
              )}
            </Text>
          ) : null}

          {remedy ? (
            <Text className={rashifalClasses.remedy}>
              {pick("उपाय", "Remedy")}: {remedy}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
