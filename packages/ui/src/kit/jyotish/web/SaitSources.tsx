import { Box, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useSaitSources } from "@vedic-patro/features/sait";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitSourcesProps } from "../contract";

export function SaitSources({ category }: SaitSourcesProps) {
  const src = useSaitSources(category);
  return (
    <Box as="section" className={saitClasses.sourcesCard}>
      <Text as="h2" className={saitClasses.sourcesHeading}>
        {src.heading}
      </Text>
      <Text as="p" className={saitClasses.sourcesBlurb}>
        {src.blurb}
      </Text>
      <Box as="ol" className={saitClasses.sourcesList}>
        {src.sources.map((s) => (
          <Box as="li" key={s.id} className={cn(saitClasses.sourceItem, saitClasses.sourceText)}>
            <Text as="span" className={saitClasses.sourceNum}>
              {s.num}
            </Text>
            <Box className={saitClasses.sourceBody}>
              <Text as="p" className={saitClasses.sourceCredit}>
                {s.credit}
              </Text>
              <Text as="p" className={saitClasses.sourceDetail}>
                {s.edition}
              </Text>
              <Text as="p" className={saitClasses.sourceDetail}>
                {s.used}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
