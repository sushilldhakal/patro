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
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

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
  const { t, lang, pick, digits } = useLocale();
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
    <View className={cn("flex-1", gocharClasses.deepCard)}>
      <View className={gocharClasses.deepHead}>
        <Text className={gocharClasses.deepEyebrow} style={nepaliTextStyle()}>
          {t("ui.gochar.deep_dive")}
        </Text>
        <Text className={gocharClasses.deepTitle} style={nepaliTextStyle()}>
          {t("ui.gochar.pick_a_planet")}
        </Text>
        <Text className={gocharClasses.deepSubtitle} style={nepaliTextStyle()}>
          {t("ui.gochar.current_position_windows_retrograde")}
        </Text>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.pickerGrid)}>
        {GRAHA_DETAIL_ORDER.map((key) => {
          if (!gochar[key]) return null;
          const active = key === selected;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={{ width: pickerWidth as never }}
              className={cn(
                gocharClasses.pickerButton,
                "active:opacity-80",
                active ? gocharClasses.pickerActive : gocharClasses.pickerIdle,
              )}
            >
              <GrahaPlanetIcon graha={key} size={28} />
              <Text
                className={cn(
                  "w-full",
                  gocharClasses.pickerLabel,
                  active ? gocharClasses.pickerLabelActive : gocharClasses.pickerLabelIdle,
                )}
                style={nepaliTextStyle()}
              >
                {pick(GRAHA_NAME[key].ne, GRAHA_NAME[key].en)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className={gocharClasses.detail}>
        <View className={cn("flex-row flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={selected} size={36} />
          <Text className={gocharClasses.detailTitle} style={nepaliTextStyle()}>
            {name}
          </Text>
          {g.name_vedic ? (
            <Text className={cn("ml-2", gocharClasses.detailVedic)} style={nepaliTextStyle()}>
              ({g.name_vedic})
            </Text>
          ) : null}
          {grahaExalted(selected, g) ? (
            <View className={gocharClasses.detailBadge}>
              <Text
                className={gocharClasses.detailBadgeText}
                style={nepaliTextStyle()}
              >
                {t("ui.gochar.exalted")}
              </Text>
            </View>
          ) : null}
        </View>

        <View className={cn("flex-row flex-wrap", gocharClasses.factGrid)}>
          <Detail width={detailWidth} label={t("ui.gochar.sign")} value={`${rashi} ${deg}`} />
          <Detail
            width={detailWidth}
            label={t("nakshatra")}
            value={grahaNakshatraLine(g, lang, digits)}
          />
          <Detail width={detailWidth} label={t("ui.gochar.motion")} value={motionLabel(g, lang)} />
          <Detail width={detailWidth} label={t("ui.gochar.speed")} value={speedTone(g, lang)} />
        </View>

        {windows.length > 0 ? (
          <View className={gocharClasses.windowsBox}>
            <Text
              className={gocharClasses.windowsTitle}
              style={nepaliTextStyle()}
            >
              {t("ui.gochar.current_windows")}
            </Text>
            <View className={cn("gap-1", gocharClasses.windowsList)}>
              {windows.map((w) => (
                <Text key={w} className={gocharClasses.windowsItem} style={nepaliTextStyle()}>
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
      className={gocharClasses.fact}
    >
      <Text
        className={gocharClasses.factLabel}
        style={nepaliTextStyle()}
      >
        {label}
      </Text>
      <Text className={gocharClasses.factValue} style={nepaliTextStyle()}>
        {value}
      </Text>
    </View>
  );
}
