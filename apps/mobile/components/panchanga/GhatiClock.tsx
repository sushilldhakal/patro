import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { getZonedTimeParts, minutesSinceMidnightInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { parseTimeToMinutes } from "@vedic-patro/domain/ghati-clock";

import { brand, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
const PANEL_BG = wheel.sky2;
const INK = brand.offWhite;
const INK_MUTED = withAlpha(brand.offWhite, 0.55);
const INK_DIM = withAlpha(brand.offWhite, 0.50);
const INK_SOFT = withAlpha(brand.offWhite, 0.65);
const INK_BODY = withAlpha(brand.offWhite, 0.80);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type Props = {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
};

export function GhatiClock({ sunrise, sunset, timezone }: Props) {
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const [now, setNow] = useState(() => new Date());
  const timeZone = timezone || "Asia/Kathmandu";

  useEffect(() => {
    /* The display only ever shows whole seconds (both clocks read down to
       :ss), so anything faster than 1s was re-rendering 5x more often than a
       digit on screen could actually change. */
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { hour: hh, minute: mm, second: ss } = useMemo(
    () => getZonedTimeParts(now, timeZone),
    [now, timeZone],
  );

  const sunriseMin = parseTimeToMinutes(sunrise) ?? 5 * 60 + 12;
  const minsNow = minutesSinceMidnightInTimezone(now, timeZone, true);
  let vg = (minsNow - sunriseMin) / 24;
  if (vg < 0) vg += 60;
  const gh = Math.floor(vg);
  const pa = Math.floor((vg - gh) * 60);
  const vi = Math.floor(((vg - gh) * 60 - pa) * 60);

  const panchangAccent = colors.secondary;

  return (
    <View
      className="relative overflow-hidden rounded-xl px-4 pb-4 pt-5 shadow-lg"
      style={{ backgroundColor: PANEL_BG }}
    >
      <Text
        className="text-sm text-center font-semibold tracking-eyebrow-wide"
        style={{ color: INK_MUTED }}
      >
        {t("panchanga.vedic_time")}
      </Text>
      <Text
        className="text-5xl mt-3.5 text-center font-mono font-bold leading-none tracking-tight"
        style={{ color: INK }}
      >
        {digits(pad2(gh))}
        <Text style={{ color: withAlpha(brand.offWhite, 0.40) }}>:</Text>
        {digits(pad2(pa))}
        <Text style={{ color: withAlpha(brand.offWhite, 0.40) }}>:</Text>
        <Text className="text-sm" style={{ color: INK_SOFT }}>
          {digits(pad2(vi))}
        </Text>
      </Text>
      <Text
        className="text-sm mt-2 text-center font-semibold tracking-wide"
        style={{ color: panchangAccent }}
      >
        {t("panchanga.ghati_pala_vipala")}
      </Text>

      <View className="mx-5 my-3.5 h-px" style={{ backgroundColor: withAlpha(neutral.white, 0.12) }} />

      <Text
        className="text-xl text-center font-mono font-bold leading-none"
        style={{ color: INK }}
      >
        {digits(pad2(hh))}:{digits(pad2(mm))}
        <Text className="text-sm" style={{ color: INK_SOFT }}>
          :{digits(pad2(ss))}
        </Text>
      </Text>
      <Text
        className="text-sm mt-2 text-center font-semibold tracking-wide"
        style={{ color: INK_DIM }}
      >
        {t("panchanga.hour_minute")}
      </Text>

      <View className="mt-3.5 flex-row flex-wrap items-center justify-center gap-4">
        {sunrise ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sunny-outline" size={14} color={INK_BODY} />
            <Text className="text-sm text-center font-mono" style={{ color: INK_BODY }}>
              {sunrise}
            </Text>
          </View>
        ) : null}
        {sunset ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="moon-outline" size={14} color={INK_BODY} />
            <Text className="text-sm text-center font-mono" style={{ color: INK_BODY }}>
              {sunset}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
