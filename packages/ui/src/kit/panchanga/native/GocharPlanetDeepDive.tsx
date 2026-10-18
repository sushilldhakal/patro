import { View, useWindowDimensions } from "react-native";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharDeepDive } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { breakpoints } from "@vedic-patro/design-tokens";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

export function GocharPlanetDeepDive({
  gochar,
  selected,
  onSelect,
}: {
  gochar: Parameters<typeof useGocharDeepDive>[0];
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
}) {
  const { width } = useWindowDimensions();
  const { picker, detail, copy } = useGocharDeepDive(gochar, selected);
  if (!detail) return null;

  const pickerCols = width >= breakpoints.lg ? 9 : width >= breakpoints.sm ? 5 : 3;
  const pickerWidth = `${(100 / pickerCols - 1.5).toFixed(2)}%`;
  const detailCols = width >= breakpoints.lg ? 4 : width >= breakpoints.sm ? 2 : 1;
  const detailWidth = detailCols === 1 ? "100%" : `${(100 / detailCols - 1.5).toFixed(2)}%`;

  return (
    <Box className={cn("flex-1", gocharClasses.deepCard)}>
      <Box className={gocharClasses.deepHead}>
        <Text className={gocharClasses.deepEyebrow}>{copy.eyebrow}</Text>
        <Text className={gocharClasses.deepTitle}>{copy.title}</Text>
        <Text className={gocharClasses.deepSubtitle}>{copy.subtitle}</Text>
      </Box>

      <Box className={cn("flex-row flex-wrap", gocharClasses.pickerGrid)}>
        {picker.map(({ key, name, active }) => (
          <View key={key} style={{ width: pickerWidth as never }}>
            <Pressable
              onPress={() => onSelect(key)}
              className={cn(
                gocharClasses.pickerButton,
                "active:opacity-80",
                active ? gocharClasses.pickerActive : gocharClasses.pickerIdle,
              )}
            >
              <GrahaPlanetIcon graha={key} size={28} />
              <Text className={cn("w-full", gocharClasses.pickerLabel, active ? gocharClasses.pickerLabelActive : gocharClasses.pickerLabelIdle)}>
                {name}
              </Text>
            </Pressable>
          </View>
        ))}
      </Box>

      <Box className={gocharClasses.detail}>
        <Box className={cn("flex-row flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={detail.key} size={36} />
          <Text className={gocharClasses.detailTitle}>{detail.name}</Text>
          {detail.vedicName ? <Text className={cn("ml-2", gocharClasses.detailVedic)}>({detail.vedicName})</Text> : null}
          {detail.exalted ? (
            <Box className={gocharClasses.detailBadge}>
              <Text className={gocharClasses.detailBadgeText}>{copy.exalted}</Text>
            </Box>
          ) : null}
        </Box>

        <Box className={cn("flex-row flex-wrap", gocharClasses.factGrid)}>
          {detail.facts.map((fact) => (
            <Detail key={fact.key} width={detailWidth} label={fact.label} value={fact.value} />
          ))}
        </Box>

        {detail.windows.length > 0 ? (
          <Box className={gocharClasses.windowsBox}>
            <Text className={gocharClasses.windowsTitle}>{copy.windowsTitle}</Text>
            <Box className={cn("gap-1", gocharClasses.windowsList)}>
              {detail.windows.map((w) => (
                <Text key={w} className={gocharClasses.windowsItem}>
                  •  {w}
                </Text>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function Detail({ width, label, value }: { width: string; label: string; value: string }) {
  return (
    <View style={{ width: width as never }} className={gocharClasses.fact}>
      <Text className={gocharClasses.factLabel}>{label}</Text>
      <Text className={gocharClasses.factValue}>{value}</Text>
    </View>
  );
}
