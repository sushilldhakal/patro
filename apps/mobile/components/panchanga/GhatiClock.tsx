import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { getZonedTimeParts, minutesSinceMidnightInTimezone } from "@/lib/zoned-time";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

const PANEL_BG = "#07080d";
const INK = "#f5f5f1";
const INK_MUTED = "rgba(245,245,241,0.55)";
const INK_DIM = "rgba(245,245,241,0.50)";
const INK_SOFT = "rgba(245,245,241,0.65)";
const INK_BODY = "rgba(245,245,241,0.80)";

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type Props = {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
};

export function GhatiClock({ sunrise, sunset, timezone }: Props) {
  const { pick, digits } = useLocale();
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
        className="text-body text-center font-semibold tracking-[0.16em]"
        style={{ color: INK_MUTED }}
      >
        {pick("वैदिक समय", "Vedic time")}
      </Text>
      <Text
        className="text-display mt-3.5 text-center font-mono font-bold tracking-tight"
        style={{ color: INK }}
      >
        {digits(pad2(gh))}
        <Text style={{ color: "rgba(245,245,241,0.40)" }}>:</Text>
        {digits(pad2(pa))}
        <Text style={{ color: "rgba(245,245,241,0.40)" }}>:</Text>
        <Text className="text-body" style={{ color: INK_SOFT }}>
          {digits(pad2(vi))}
        </Text>
      </Text>
      <Text
        className="text-body mt-2 text-center font-semibold tracking-wide"
        style={{ color: panchangAccent }}
      >
        {pick("घडी : पला : विपला", "Ghati : Pala : Vipala")}
      </Text>

      <View className="mx-5 my-3.5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />

      <Text
        className="text-title text-center font-mono font-bold"
        style={{ color: INK }}
      >
        {digits(pad2(hh))}:{digits(pad2(mm))}
        <Text className="text-body" style={{ color: INK_SOFT }}>
          :{digits(pad2(ss))}
        </Text>
      </Text>
      <Text
        className="text-body mt-2 text-center font-semibold tracking-wide"
        style={{ color: INK_DIM }}
      >
        {pick("घण्टा : मिनेट", "Hour : Minute")}
      </Text>

      <View className="mt-3.5 flex-row flex-wrap items-center justify-center gap-4">
        {sunrise ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sunny-outline" size={14} color={INK_BODY} />
            <Text className="text-body text-center font-mono" style={{ color: INK_BODY }}>
              {sunrise}
            </Text>
          </View>
        ) : null}
        {sunset ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="moon-outline" size={14} color={INK_BODY} />
            <Text className="text-body text-center font-mono" style={{ color: INK_BODY }}>
              {sunset}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
