import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiName } from "@/lib/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          className={cn("size-1.5 rounded-full", n <= stars ? rashifalToneBar(tone) : "bg-border")}
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
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <Ionicons name={icon} size={14} color={colors.mutedForeground} />
      <Text className="min-w-0 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
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
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <View className="flex-row items-start gap-3 border-b border-border bg-secondary/10 px-4 py-3">
        <RashiGlyphIcon name={getRashiName(sign.id, lang)} number={sign.id} size={36} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
            {displayName}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {sign.syllables_ne}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2.5 border-b border-border/60 px-4 py-2.5">
        <StarMeter stars={sign.stars ?? 3} tone={sign.tone} />
        <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <View className={cn("h-full rounded-full", rashifalToneBar(sign.tone))} style={{ width: `${pct}%` }} />
        </View>
        <Text className={cn("text-xs font-bold tabular-nums", rashifalToneText(sign.tone))}>
          {digits(pct)}%
        </Text>
      </View>

      {grade ? (
        <Text className="border-b border-border/60 px-4 pb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {grade}
        </Text>
      ) : null}

      {sign.domains?.length ? (
        <View className="flex-row flex-wrap border-b border-border/60 px-4 py-3">
          {sign.domains.map((domain) => {
            const icon = RASHIFAL_DOMAIN_ICON[domain.key];
            const label = ne ? domain.label_ne : domain.label_en;
            return (
              <View key={domain.key} className="mb-2 w-1/3 min-w-0 px-1">
                <View className="flex-row items-center gap-1">
                  <Ionicons name={icon} size={14} color={colors.mutedForeground} />
                  <Text className="flex-1 text-[12px] font-semibold text-muted-foreground" numberOfLines={1}>
                    {label}
                  </Text>
                </View>
                <View className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <View
                    className={cn("h-full rounded-full", rashifalToneBar(domain.tone))}
                    style={{ width: `${domain.percent}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text className="px-4 py-3.5 text-sm leading-relaxed text-foreground/90" style={nepaliTextStyle(14)}>
        {prediction}
      </Text>

      <View className="flex-row flex-wrap gap-x-3 gap-y-2 border-t border-border bg-muted/25 px-4 py-2.5">
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
        className="flex-row items-center justify-between border-t border-border px-4 py-2.5 active:opacity-80"
      >
        <Text className="text-xs font-semibold text-muted-foreground">
          {pick("किन यस्तो?", "Why this reading?")}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className="border-t border-border bg-surface-muted px-4 py-3">
          {sign.components?.map((component) => (
            <View key={component.key} className="mb-1.5 flex-row items-baseline gap-2">
              <Text className="w-24 shrink-0 text-xs font-semibold text-foreground">
                {ne ? component.label_ne : component.label_en}
              </Text>
              <Text className="min-w-0 flex-1 text-xs text-muted-foreground">
                {ne ? component.note_ne : component.note_en}
              </Text>
              <Text className={cn("shrink-0 text-xs font-bold tabular-nums", rashifalToneText(component.tone))}>
                {toNepaliDigits(component.percent, lang)}
              </Text>
            </View>
          ))}

          {sign.gochar?.length ? <RashifalGocharChips rows={sign.gochar} /> : null}

          {lord ? (
            <Text className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {pick(
                `${lord.lord_ne} · ${lord.house} · ${lord.sign_ne}`,
                `${lord.lord_en} · house ${lord.house} · ${lord.sign_en}`,
              )}
            </Text>
          ) : null}

          {period !== "daily" && sign.best_day && sign.weak_day ? (
            <Text className="mt-2 text-xs text-muted-foreground">
              {pick(
                `उत्तम: ${sign.best_day.date_bs ?? sign.best_day.date_ad} · कमजोर: ${sign.weak_day.date_bs ?? sign.weak_day.date_ad}`,
                `Best: ${sign.best_day.date_ad} · Weak: ${sign.weak_day.date_ad}`,
              )}
            </Text>
          ) : null}

          {remedy ? (
            <Text className="mt-2 text-xs font-medium text-foreground/80">
              {pick("उपाय", "Remedy")}: {remedy}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
