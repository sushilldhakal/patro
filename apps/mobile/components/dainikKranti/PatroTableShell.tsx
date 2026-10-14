import { type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableScrollShell } from "@/components/ui/DataTable";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePatroTableShell } from "@vedic-patro/features/common";
import { cn } from "@vedic-patro/domain/utils";
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
    <View className={cn(dainikKrantiClasses.shell, "overflow-hidden", className)}>
      <View className={dainikKrantiClasses.shellHead}>
        <Text className={dainikKrantiClasses.shellTitle} style={nepaliTextStyle()}>{shell.title}</Text>
        {shell.titleEn ? <Text className={dainikKrantiClasses.shellTitleEn} style={nepaliTextStyle()}>{shell.titleEn}</Text> : null}
        {shell.subtitle ? (
          <Text className={dainikKrantiClasses.shellSubtitle} style={nepaliTextStyle()}>
            {shell.subtitle}
          </Text>
        ) : null}
      </View>
      <TableScrollShell bordered={false} rounded={false} className="max-w-full">
        {children}
      </TableScrollShell>
    </View>
  );
}
