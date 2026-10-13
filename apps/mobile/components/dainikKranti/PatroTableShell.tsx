import { type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableScrollShell } from "@/components/ui/DataTable";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  titleNe: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  children: ReactNode;
  className?: string;
};

export function PatroTableShell({ titleNe, titleEn, subtitle, subtitleEn, children, className }: Props) {
  const { lang, pick } = useLocale();
  return (
    <View className={cn(dainikKrantiClasses.shell, "overflow-hidden", className)}>
      <View className={dainikKrantiClasses.shellHead}>
        <Text className={dainikKrantiClasses.shellTitle} style={nepaliTextStyle()}>{pick(titleNe, titleEn ?? titleNe)}</Text>
        {titleEn && lang === "ne" ? <Text className={dainikKrantiClasses.shellTitleEn} style={nepaliTextStyle()}>{titleEn}</Text> : null}
        {subtitle ? (
          <Text className={dainikKrantiClasses.shellSubtitle} style={nepaliTextStyle()}>
            {pick(subtitle, subtitleEn ?? subtitle)}
          </Text>
        ) : null}
      </View>
      <TableScrollShell bordered={false} rounded={false} className="max-w-full">
        {children}
      </TableScrollShell>
    </View>
  );
}
