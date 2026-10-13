import { Pressable, View } from "react-native";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Text } from "@/components/ui/Text";
import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharDeepDive } from "@vedic-patro/features/gochar";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

export function GocharPlanetDeepDive({
  gochar,
  selected,
  onSelect,
}: {
  gochar: Record<string, GocharGraha>;
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
}) {
  const { width } = useBreakpoint();
  const { picker, detail, copy } = useGocharDeepDive(gochar, selected);
  if (!detail) return null;

  const pickerCols = width >= 1024 ? 9 : width >= 640 ? 5 : 3;
  const pickerWidth = `${(100 / pickerCols - 1.5).toFixed(2)}%`;
  const detailCols = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  const detailWidth = detailCols === 1 ? "100%" : `${(100 / detailCols - 1.5).toFixed(2)}%`;

  return (
    <View className={cn("flex-1", gocharClasses.deepCard)}>
      <View className={gocharClasses.deepHead}>
        <Text className={gocharClasses.deepEyebrow} style={nepaliTextStyle()}>
          {copy.eyebrow}
        </Text>
        <Text className={gocharClasses.deepTitle} style={nepaliTextStyle()}>
          {copy.title}
        </Text>
        <Text className={gocharClasses.deepSubtitle} style={nepaliTextStyle()}>
          {copy.subtitle}
        </Text>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.pickerGrid)}>
        {picker.map(({ key, name, active }) => (
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
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className={gocharClasses.detail}>
        <View className={cn("flex-row flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={detail.key} size={36} />
          <Text className={gocharClasses.detailTitle} style={nepaliTextStyle()}>
            {detail.name}
          </Text>
          {detail.vedicName ? (
            <Text className={cn("ml-2", gocharClasses.detailVedic)} style={nepaliTextStyle()}>
              ({detail.vedicName})
            </Text>
          ) : null}
          {detail.exalted ? (
            <View className={gocharClasses.detailBadge}>
              <Text className={gocharClasses.detailBadgeText} style={nepaliTextStyle()}>
                {copy.exalted}
              </Text>
            </View>
          ) : null}
        </View>

        <View className={cn("flex-row flex-wrap", gocharClasses.factGrid)}>
          {detail.facts.map((fact) => (
            <Detail key={fact.key} width={detailWidth} label={fact.label} value={fact.value} />
          ))}
        </View>

        {detail.windows.length > 0 ? (
          <View className={gocharClasses.windowsBox}>
            <Text className={gocharClasses.windowsTitle} style={nepaliTextStyle()}>
              {copy.windowsTitle}
            </Text>
            <View className={cn("gap-1", gocharClasses.windowsList)}>
              {detail.windows.map((w) => (
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
