import type { IconNode } from "../../../contract";
import { usePatroSolarCorrection, type PatroSolarKey } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
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
        <Box
          key={item.key}
          className={cn(
            dainikKrantiClasses.solarItem,
            item.highlight ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
          )}
          webClassName="max-w-[48%]"
        >
          <Box className={cn(dainikKrantiClasses.solarLabel, dainikKrantiClasses.solarLabelText)}>
            <Icon node={SOLAR_ICON[item.key]} size={14} tone={item.highlight ? "secondary" : "muted"} />
            {item.label}
          </Box>
          <Text
            as="div"
            className={cn(
              dainikKrantiClasses.solarValue,
              "break-words",
              item.highlight ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
            )}
          >
            {item.value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
