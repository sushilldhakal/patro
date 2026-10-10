import { Pressable, View } from "react-native";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Text } from "@/components/ui/Text";
import type { GocharGraha } from "@/lib/api";
import { grahaRashiNe } from "@vedic-patro/domain/dainikKranti/gochar-display";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
  speedTone,
} from "@vedic-patro/domain/gochar-page-utils";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

function windowLine(
  labelNe: string,
  labelEn: string,
  entryLocal: string | undefined,
  lang: "ne" | "en",
): string | undefined {
  if (!entryLocal) return undefined;
  const when = formatGocharPatroDate(entryLocal.slice(0, 10), lang);
  return lang === "en" ? `${labelEn} until ${when}` : `${labelNe} ${when} सम्म`;
}

export function GocharPlanetDeepDive({
  gochar,
  selected,
  onSelect,
}: {
  gochar: Record<string, GocharGraha>;
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();

  const g = gochar[selected];
  if (!g) return null;

  const pickerCols = width >= 1024 ? 9 : width >= 640 ? 5 : 3;
  const pickerWidth = `${(100 / pickerCols - 1.5).toFixed(2)}%`;
  const detailCols = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  const detailWidth = detailCols === 1 ? "100%" : `${(100 / detailCols - 1.5).toFixed(2)}%`;

  const name = pick(GRAHA_NAME[selected].ne, GRAHA_NAME[selected].en);
  const rashi = lang === "en" ? (g.rashi ?? "") : (grahaRashiNe(g) ?? g.rashi_ne ?? "");
  const deg = g.deg_in_rashi != null ? `${digits(g.deg_in_rashi.toFixed(1))}°` : "—";

  const windows = [
    windowLine(
      g.rashi_ne ?? g.rashi ?? "",
      g.rashi ?? "",
      g.next_rashi_entry?.entry_time_local,
      lang,
    ),
    windowLine(
      g.next_nakshatra_entry?.to_nakshatra_ne ?? "",
      g.next_nakshatra_entry?.to_nakshatra ?? "",
      g.next_nakshatra_entry?.entry_time_local,
      lang,
    ),
    g.next_pada_entry?.to_pada
      ? windowLine(
          `पद ${digits(g.next_pada_entry.to_pada)}`,
          `Pada ${g.next_pada_entry.to_pada}`,
          g.next_pada_entry.entry_time_local,
          lang,
        )
      : undefined,
  ].filter(Boolean) as string[];

  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-border bg-card">
      <View className="border-b border-border px-4 py-4">
        <Text
          style={{ letterSpacing: 1.4, ...nepaliTextStyle(11) }}
          className="text-caption font-bold uppercase text-muted-foreground"
        >
          {pick("विस्तृत अध्ययन", "Deep dive")}
        </Text>
        <Text className="text-title mt-1 font-bold text-foreground" style={nepaliTextStyle(18)}>
          {pick("ग्रह छान्नुहोस्", "Pick a planet")}
        </Text>
        <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick("वर्तमान स्थिति, सीमा र वक्री", "Current position, windows & retrograde")}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2 px-4 py-3">
        {GRAHA_DETAIL_ORDER.map((key) => {
          if (!gochar[key]) return null;
          const active = key === selected;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={{
                width: pickerWidth as never,
                borderColor: active ? colors.secondary : colors.border,
                backgroundColor: active
                  ? colorWithAlpha("#0b565a", 0.15)
                  : colors.surfaceInset,
              }}
              className="items-center gap-1 rounded-xl border px-1.5 py-2 active:opacity-80"
            >
              <GrahaPlanetIcon graha={key} size={28} />
              <Text
                numberOfLines={1}
                style={{
                  color: active ? colors.secondary : colors.foreground,
                  ...nepaliTextStyle(10),
                }}
                className="text-caption font-bold"
              >
                {pick(GRAHA_NAME[key].ne, GRAHA_NAME[key].en)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="border-t border-border px-4 py-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <GrahaPlanetIcon graha={selected} size={36} />
          <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(20)}>
            {name}
          </Text>
          {g.name_vedic ? (
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
              ({g.name_vedic})
            </Text>
          ) : null}
          {grahaExalted(selected, g) ? (
            <View
              style={{ backgroundColor: "rgba(245,158,11,0.15)" }}
              className="rounded-md px-2 py-0.5"
            >
              <Text
                style={{ color: colors.primary, ...nepaliTextStyle(11) }}
                className="text-caption font-bold"
              >
                {pick("उच्च", "Exalted")}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-4 flex-row flex-wrap gap-3">
          <Detail width={detailWidth} label={pick("राशि", "Sign")} value={`${rashi} ${deg}`} />
          <Detail
            width={detailWidth}
            label={pick("नक्षत्र", "Nakshatra")}
            value={grahaNakshatraLine(g, lang, digits)}
          />
          <Detail width={detailWidth} label={pick("गति", "Motion")} value={motionLabel(g, lang)} />
          <Detail width={detailWidth} label={pick("वेग", "Speed")} value={speedTone(g, lang)} />
        </View>

        {windows.length > 0 ? (
          <View
            style={{ backgroundColor: colors.surfaceInset }}
            className="mt-4 rounded-xl p-3.5"
          >
            <Text
              className="text-caption font-bold uppercase tracking-wide text-muted-foreground"
              style={nepaliTextStyle(11)}
            >
              {pick("हालका सीमाहरू", "Current windows")}
            </Text>
            <View className="mt-2 gap-1">
              {windows.map((w) => (
                <Text key={w} className="text-body text-foreground" style={nepaliTextStyle(14)}>
                  •  {w}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Detail({ width, label, value }: { width: string; label: string; value: string }) {
  return (
    <View
      style={{ width: width as never }}
      className="rounded-lg border border-border bg-background px-3 py-2.5"
    >
      <Text
        className="text-caption font-bold uppercase tracking-wide text-muted-foreground"
        style={nepaliTextStyle(10)}
      >
        {label}
      </Text>
      <Text className="text-body mt-1 font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {value}
      </Text>
    </View>
  );
}
