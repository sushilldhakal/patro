import { type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableScrollShell } from "@/components/ui/DataTable";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";

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
    <View className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <View className="border-b border-border px-4 py-3">
        <Text className="text-body font-semibold text-foreground">{pick(titleNe, titleEn ?? titleNe)}</Text>
        {titleEn && lang === "ne" ? <Text className="text-body mt-0.5 text-muted-foreground">{titleEn}</Text> : null}
        {subtitle ? (
          <Text className="text-body mt-1 leading-relaxed text-muted-foreground">
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
