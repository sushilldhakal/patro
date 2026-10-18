import type { ReactNode } from "react";
import { ScrollView } from "react-native";
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
    <Box className={cn(dainikKrantiClasses.shell, "overflow-hidden", className)}>
      <Box className={dainikKrantiClasses.shellHead}>
        <Text className={dainikKrantiClasses.shellTitle}>{shell.title}</Text>
        {shell.titleEn ? <Text className={dainikKrantiClasses.shellTitleEn}>{shell.titleEn}</Text> : null}
        {shell.subtitle ? <Text className={dainikKrantiClasses.shellSubtitle}>{shell.subtitle}</Text> : null}
      </Box>
      <ScrollView horizontal showsHorizontalScrollIndicator className="max-w-full">
        {children}
      </ScrollView>
    </Box>
  );
}
