import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RashifalPersonal } from "@/lib/api";
import {
  RASHIFAL_DOMAIN_ICON,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
} from "@/lib/rashifal-ui";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { civilIsoFromDate } from "@/lib/patro-day";
import { formatPatroCivilDayLabel } from "@/lib/patro-headline-subtitle";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  name: string;
  personal: RashifalPersonal;
};

/**
 * Dasha end date, in the same locale-aware AD label the rest of the app uses
 * (static month-name tables + digit localisation) — not the platform's own
 * Intl data, which cannot be relied on to carry full Nepali month names.
 */
function formatDasha(
  iso: string,
  lang: string,
  digitFn: (n: number | string) => string,
): string {
  try {
    return formatPatroCivilDayLabel(civilIsoFromDate(new Date(iso)), lang, digitFn);
  } catch {
    return iso.slice(0, 10);
  }
}

function StarMeter({ stars, tone }: { stars: number; tone: RashifalPersonal["tone"] }) {
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

export function RashifalPersonalCard({ name, personal }: Props) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  const ne = lang === "ne";
  const prediction = ne ? personal.prediction_ne : personal.prediction_en;
  const luckyColor = ne ? personal.lucky_color_ne : personal.lucky_color_en;
  const luckyNumber = ne ? personal.lucky_number_ne : personal.lucky_number_en;
  const luckyDirection = ne ? personal.lucky_direction_ne : personal.lucky_direction_en;
  const lord = personal.rashi_lord;
  const dasha = personal.dasha;
  const pct = personal.percent ?? 50;

  return (
    <View className="overflow-hidden rounded-xl border border-secondary/40 bg-card">
      <View className="flex-row items-start gap-3 border-b border-border bg-secondary/10 px-4 py-3">
        <RashiGlyphIcon name={getRashiName(personal.moon_sign, lang)} number={personal.moon_sign} size={36} />
        <View className="min-w-0 flex-1">
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
            {name}
          </Text>
          {/* Leads with the Rashi (Moon sign) — "राशि" in everyday usage — with
              the Lagna named explicitly alongside rather than standing in for
              it. The engine's scoring is Lagna-anchored; only display order
              changes here. Mirrors web `rashifal.personal.lagna_line`. */}
          <Text className="text-caption mt-1 leading-relaxed text-muted-foreground">
            {pick(
              `राशि ${personal.moon_sign_ne} · लग्न ${personal.lagna_sign_ne} · सूर्य ${personal.sun_sign_ne}`,
              `Rashi ${personal.moon_sign_en} · Lagna ${personal.lagna_sign_en} · Sun ${personal.sun_sign_en}`,
            )}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2.5 border-b border-border/60 px-4 py-2.5">
        <StarMeter stars={personal.stars ?? 3} tone={personal.tone} />
        <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <View className={cn("h-full rounded-full", rashifalToneBar(personal.tone))} style={{ width: `${pct}%` }} />
        </View>
        <Text className={cn("text-caption font-bold tabular-nums", rashifalToneText(personal.tone))}>
          {digits(pct)}%
        </Text>
      </View>

      {/* Running dasha — the layer only a birth chart can give. */}
      {dasha ? (
        <View className="flex-row items-center gap-1.5 border-b border-border/60 bg-muted/20 px-4 py-2">
          <Ionicons name="time-outline" size={14} color={colors.secondary} />
          <Text
            numberOfLines={1}
            className="text-caption flex-1 font-semibold text-foreground"
            style={nepaliTextStyle(12)}
          >
            {pick(
              `${dasha.mahadasha.lord_ne} महादशा, ${dasha.antardasha.lord_ne} अन्तर्दशा चलिरहेको`,
              `Running ${dasha.mahadasha.lord_en} Mahadasha, ${dasha.antardasha.lord_en} Antardasha`,
            )}
          </Text>
        </View>
      ) : null}

      {personal.domains?.length ? (
        <View className="flex-row flex-wrap border-b border-border/60 px-4 py-3">
          {personal.domains.map((domain) => {
            const icon = RASHIFAL_DOMAIN_ICON[domain.key];
            const label = ne ? domain.label_ne : domain.label_en;
            return (
              <View key={domain.key} className="mb-2 w-1/3 min-w-0 px-1">
                <View className="flex-row items-center gap-1">
                  <Ionicons name={icon} size={14} color={colors.mutedForeground} />
                  <Text className="text-caption flex-1 font-semibold text-muted-foreground" numberOfLines={1}>
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

      <Text className="text-body px-4 py-3.5 leading-relaxed text-foreground/90" style={nepaliTextStyle(14)}>
        {prediction}
      </Text>

      <View className="gap-1 border-t border-border bg-muted/25 px-4 py-2.5">
        <Text className="text-caption text-muted-foreground">
          {pick("शुभ रङ", "Lucky color")}: {luckyColor} · {pick("अंक", "Number")}: {luckyNumber}
        </Text>
        {luckyDirection ? (
          <Text className="text-caption text-muted-foreground">
            {pick("दिशा", "Direction")}: {luckyDirection}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between border-t border-border px-4 py-2.5 active:opacity-80"
      >
        <Text className="text-caption font-semibold text-muted-foreground">
          {pick("विवरण", "Details")}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>

      {open ? (
        <View className="border-t border-border bg-surface-muted px-4 py-3">
          {personal.components?.map((component) => (
            <View key={component.key} className="mb-1.5 flex-row items-baseline gap-2">
              <Text className="text-caption w-24 shrink-0 font-semibold text-foreground">
                {ne ? component.label_ne : component.label_en}
              </Text>
              <Text className="text-caption min-w-0 flex-1 text-muted-foreground">
                {ne ? component.note_ne : component.note_en}
              </Text>
              <Text className={cn("text-caption shrink-0 font-bold", rashifalToneText(component.tone))}>
                {toNepaliDigits(component.percent, lang)}
              </Text>
            </View>
          ))}
          {personal.gochar?.length ? <RashifalGocharChips rows={personal.gochar} /> : null}

          {lord ? (
            <Text className="text-caption mt-3 border-t border-border/60 pt-3 text-muted-foreground">
              {pick(
                `${lord.lord_ne} ${lord.house} भावमा, ${lord.sign_ne} राशिमा — ${lord.dignity_ne}`,
                `${lord.lord_en} in house ${lord.house}, ${lord.sign_en} — ${lord.dignity_en}`,
              )}
            </Text>
          ) : null}

          {dasha ? (
            <Text className="text-caption mt-2 text-muted-foreground">
              {pick(
                `${dasha.mahadasha.lord_ne} महादशा ${formatDasha(dasha.mahadasha.end, lang, digits)}सम्म। ${dasha.antardasha.lord_ne} अन्तर्दशा ${formatDasha(dasha.antardasha.end, lang, digits)}सम्म।`,
                `${dasha.mahadasha.lord_en} Mahadasha until ${formatDasha(dasha.mahadasha.end, lang, digits)}. ${dasha.antardasha.lord_en} Antardasha until ${formatDasha(dasha.antardasha.end, lang, digits)}.`,
              )}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
