import { type ReactNode } from "react";
import { View } from "react-native";
import { tFor } from "@vedic-patro/i18n/runtime";
import { Text } from "@/components/ui/Text";
import { TableScrollShell } from "@/components/ui/DataTable";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
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
  const { t, lang } = useLocale();
  return (
    <View className={cn(dainikKrantiClasses.shell, "overflow-hidden", className)}>
      <View className={dainikKrantiClasses.shellHead}>
        <Text className={dainikKrantiClasses.shellTitle} style={nepaliTextStyle()}>{t(titleKey)}</Text>
        {lang === "ne" ? <Text className={dainikKrantiClasses.shellTitleEn} style={nepaliTextStyle()}>{tFor("en", titleKey)}</Text> : null}
        {subtitleKey ? (
          <Text className={dainikKrantiClasses.shellSubtitle} style={nepaliTextStyle()}>
            {t(subtitleKey)}
          </Text>
        ) : null}
      </View>
      <TableScrollShell bordered={false} rounded={false} className="max-w-full">
        {children}
      </TableScrollShell>
    </View>
  );
}
