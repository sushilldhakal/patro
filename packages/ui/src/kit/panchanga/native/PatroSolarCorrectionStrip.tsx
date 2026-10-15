import { View } from "react-native";
import type { IconNode } from "../../../contract";
import { usePatroSolarCorrection, type PatroSolarKey } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { clockIcon, globeIcon, navigationIcon } from "../icons";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ICON: Record<PatroSolarKey, IconNode> = {
  deshaantar: globeIcon,
  akshamsha: navigationIcon,
  belaantar: clockIcon,
};

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const items = usePatroSolarCorrection({ deshaantar, akshamsha, belaantar });
  if (items.length === 0) return null;

  return (
    <Box className={cn(dainikKrantiClasses.solarStrip, className)}>
      {items.map((item) => (
        <View
          key={item.key}
          className={cn(
            dainikKrantiClasses.solarItem,
            item.highlight ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
          )}
          style={{ maxWidth: "48%" }}
        >
          <Box className={dainikKrantiClasses.solarLabel}>
            <Icon node={SOLAR_ICON[item.key]} size={14} tone={item.highlight ? "secondary" : "muted"} />
            <Text className={dainikKrantiClasses.solarLabelText}>{item.label}</Text>
          </Box>
          <Text
            className={cn(
              dainikKrantiClasses.solarValue,
              item.highlight ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
            )}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </Box>
  );
}
