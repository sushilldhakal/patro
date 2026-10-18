import type { ReactNode } from "react";
import { usePatroTableShell } from "@vedic-patro/features/common";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  /** Copy keys; in Nepali the English title shows under the Nepali one. */
  titleKey: string;
  subtitleKey?: string;
  children: ReactNode;
  className?: string;
};

export function PatroTableShell({ titleKey, subtitleKey, children, className }: Props) {
  const shell = usePatroTableShell(titleKey, subtitleKey);
  return (
    <Box as="section" className={cn(dainikKrantiClasses.shell, className)}>
      <Box as="header" className={dainikKrantiClasses.shellHead}>
        <Text as="h3" className={dainikKrantiClasses.shellTitle}>
          {shell.title}
        </Text>
        {shell.titleEn ? (
          <Text as="p" className={dainikKrantiClasses.shellTitleEn}>
            {shell.titleEn}
          </Text>
        ) : null}
        {shell.subtitle ? (
          <Text as="p" className={dainikKrantiClasses.shellSubtitle}>
            {shell.subtitle}
          </Text>
        ) : null}
      </Box>
      <Box className="overflow-x-auto">{children}</Box>
    </Box>
  );
}
