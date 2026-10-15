import { Box, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useSaitSources } from "@vedic-patro/features/sait";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitSourcesProps } from "../contract";

export function SaitSources({ category }: SaitSourcesProps) {
  const src = useSaitSources(category);
  return (
    <Box className={saitClasses.sourcesCard}>
      <Text as="h2" className={saitClasses.sourcesHeading}>
        {src.heading}
      </Text>
      <Text as="p" className={saitClasses.sourcesBlurb}>
        {src.blurb}
      </Text>
      <Box className={saitClasses.sourcesList}>
        {src.sources.map((s) => (
          <Box key={s.id} className={saitClasses.sourceItem}>
            <Text className={cn(saitClasses.sourceText, saitClasses.sourceNum)}>{s.num}</Text>
            <Box className={saitClasses.sourceBody} nativeClassName="flex-1">
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceCredit)}>{s.credit}</Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)}>{s.edition}</Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)}>{s.used}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
