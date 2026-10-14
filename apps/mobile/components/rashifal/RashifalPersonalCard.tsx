import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { RashifalPersonal } from "@/lib/api";
import {
  RASHIFAL_DOMAIN_ICON,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
} from "@/lib/rashifal-ui";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { civilIsoFromDate } from "@vedic-patro/domain/patro-day";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/patro-headline-subtitle";
import { useThemeColors } from "@/lib/theme-context";
import { tFor } from "@vedic-patro/i18n/runtime";

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

function LuckyCell({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  const colors = useThemeColors();
  return (
    <View className={cn("w-[48%] flex-row sm:w-[32%]", rashifalClasses.luckyCell)}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} />
      <Text className={cn("min-w-0 flex-1", rashifalClasses.luckyValue)} numberOfLines={1} style={nepaliTextStyle()}>
        {value}
      </Text>
    </View>
  );
}

export function RashifalPersonalCard({ name, personal }: Props) {
  const { t, lang, pick, digits } = useLocale();
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
    <View className={rashifalClasses.cardPersonal}>
      <View className={cn("flex-row", rashifalClasses.header)}>
        <RashiGlyphIcon name={getRashiName(personal.moon_sign, lang)} number={personal.moon_sign} size={36} />
        <View className={rashifalClasses.headerBody}>
          <Text className={rashifalClasses.name} style={nepaliTextStyle()}>
            {name}
          </Text>
          {/* Leads with the Rashi (Moon sign) — "राशि" in everyday usage — with
              the Lagna named explicitly alongside rather than standing in for
              it. The engine's scoring is Lagna-anchored; only display order
              changes here. Mirrors web `rashifal.personal.lagna_line`. */}
          <Text className={rashifalClasses.nameSub} style={nepaliTextStyle()}>
            {pick(
              tFor("ne", "ui.rashifal.x_762ddce2", { v0: personal.moon_sign_ne, v1: personal.lagna_sign_ne, v2: personal.sun_sign_ne }),
              `Rashi ${personal.moon_sign_en} · Lagna ${personal.lagna_sign_en} · Sun ${personal.sun_sign_en}`,
            )}
          </Text>
        </View>
      </View>

      <View className={cn("flex-row", rashifalClasses.meter)}>
        <StarMeter stars={personal.stars ?? 3} tone={personal.tone} />
        <View className={rashifalClasses.meterTrack}>
          <View className={cn(rashifalClasses.meterFill, rashifalToneBar(personal.tone))} style={{ width: `${pct}%` }} />
        </View>
        <Text className={cn(rashifalClasses.percent, rashifalToneText(personal.tone))} style={nepaliTextStyle()}>
          {digits(pct)}%
        </Text>
      </View>

      {/* Running dasha — the layer only a birth chart can give. */}
      {dasha ? (
        <View className={cn("flex-row", rashifalClasses.dashaRow)}>
          <Ionicons name="time-outline" size={14} color={colors.secondary} />
          <Text
            numberOfLines={1}
            className={cn("flex-1", rashifalClasses.dashaText)}
            style={nepaliTextStyle()}
          >
            {pick(
              tFor("ne", "ui.rashifal.x_388669f2", { v0: dasha.mahadasha.lord_ne, v1: dasha.antardasha.lord_ne }),
              `Running ${dasha.mahadasha.lord_en} Mahadasha, ${dasha.antardasha.lord_en} Antardasha`,
            )}
          </Text>
        </View>
      ) : null}

      {personal.domains?.length ? (
        <View className={cn("flex-row flex-wrap", rashifalClasses.domains)}>
          {personal.domains.map((domain) => {
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
        <LuckyCell icon="color-palette-outline" value={luckyColor} />
        <LuckyCell icon="keypad-outline" value={luckyNumber} />
        {luckyDirection ? <LuckyCell icon="compass-outline" value={luckyDirection} /> : null}
      </View>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        className={cn("flex-row active:opacity-80", rashifalClasses.whyButton)}
      >
        <Text className={rashifalClasses.whyLabel} style={nepaliTextStyle()}>
          {t("ui.rashifal.details")}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>

      {open ? (
        <View className={rashifalClasses.details}>
          {personal.components?.length ? (
            <View className={rashifalClasses.componentList}>
              {personal.components.map((component) => (
            <View key={component.key} className={cn("flex-row", rashifalClasses.componentRow)}>
              <Text className={rashifalClasses.componentLabel} style={nepaliTextStyle()}>
                {ne ? component.label_ne : component.label_en}
              </Text>
              <Text className={rashifalClasses.componentNote} style={nepaliTextStyle()}>
                {ne ? component.note_ne : component.note_en}
              </Text>
              <Text className={cn(rashifalClasses.componentValue, rashifalToneText(component.tone))} style={nepaliTextStyle()}>
                {toNepaliDigits(component.percent, lang)}
              </Text>
            </View>
          ))}
            </View>
          ) : null}
          {personal.gochar?.length ? <RashifalGocharChips rows={personal.gochar} /> : null}

          {lord ? (
            <Text className={rashifalClasses.lordLine} style={nepaliTextStyle()}>
              {pick(
                tFor("ne", "ui.rashifal.x_5a098681", { v0: lord.lord_ne, v1: lord.house, v2: lord.sign_ne, v3: lord.dignity_ne }),
                `${lord.lord_en} in house ${lord.house}, ${lord.sign_en} — ${lord.dignity_en}`,
              )}
            </Text>
          ) : null}

          {dasha ? (
            <Text className={rashifalClasses.footNote} style={nepaliTextStyle()}>
              {pick(
                tFor("ne", "ui.rashifal.x_c9d4bf4e", { v0: dasha.mahadasha.lord_ne, v1: formatDasha(dasha.mahadasha.end, lang, digits), v2: dasha.antardasha.lord_ne, v3: formatDasha(dasha.antardasha.end, lang, digits) }),
                `${dasha.mahadasha.lord_en} Mahadasha until ${formatDasha(dasha.mahadasha.end, lang, digits)}. ${dasha.antardasha.lord_en} Antardasha until ${formatDasha(dasha.antardasha.end, lang, digits)}.`,
              )}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
