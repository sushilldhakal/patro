import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useAllElementsLink, useElementDescription, useGrahaDescription, type AboutCard } from "@vedic-patro/features/graha";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { spec } from "@vedic-patro/design-tokens";
import { Card, Icon, Text } from "@vedic-patro/ui";
import { moonIcon, rotateCcwIcon, sparklesIcon, sunriseIcon } from "../icons";
import type { IconNode } from "../../../contract";

const NAMED_ICONS: Record<string, IconNode> = {
  "sunny-outline": sunriseIcon,
  "moon-outline": moonIcon,
  "refresh-outline": rotateCcwIcon,
  "sparkles-outline": sparklesIcon,
};

export type GrahaBannerProps = {
  icon: ReactNode | string;
  title?: string;
  blurb?: string;
  titleKey?: string;
  blurbKey?: string;
};

/** Drawn as the app's standard page header (icon, title, subtitle), so these pages
    open like every other one instead of in a boxed banner. */
export function GrahaBanner({ icon, title = "", blurb = "" }: GrahaBannerProps) {
  const named = typeof icon === "string" ? NAMED_ICONS[icon] : undefined;
  return (
    <View className={cn("mb-8 flex-row", spec.pageHeaderRow)}>
      <View className="mt-0.5 shrink-0">{named ? <Icon node={named} size={28} tone="secondary" /> : icon}</View>
      <View className="min-w-0 flex-1">
        <Text className={spec.pageTitle}>{title}</Text>
        {blurb ? <Text className={spec.pageSubtitle}>{blurb}</Text> : null}
      </View>
    </View>
  );
}

function AboutCardView({ about }: { about: AboutCard | null }) {
  if (!about) return null;
  return (
    <Card className={grahaClasses.aboutCard}>
      <Text className={grahaClasses.aboutTitle}>{about.title}</Text>
      <View className={grahaClasses.aboutBody}>
        {about.blocks.map((block) => (
          <View key={block.section} className={grahaClasses.aboutBlock}>
            <Text className={grahaClasses.aboutBlockTitle}>{block.heading}</Text>
            <Text className={grahaClasses.aboutBlockText}>{block.body}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function GrahaDescription({ pageId }: { pageId: string }) {
  return <AboutCardView about={useGrahaDescription(pageId)} />;
}

export function ElementDescription({ elementId }: { elementId: string }) {
  return <AboutCardView about={useElementDescription(elementId)} />;
}

export function AllElementsLink({ onPress }: { onPress?: () => void }) {
  const { label } = useAllElementsLink();
  return (
    <Pressable onPress={onPress} className={cn(grahaClasses.detailsLink, "flex-row items-center")}>
      <Text className="text-sm font-semibold text-secondary">{label} →</Text>
    </Pressable>
  );
}

export function GrahaColumnCard({
  name,
  note,
  count,
  children,
  width,
  tight,
}: {
  name: string;
  note?: string;
  count: string;
  children: ReactNode;
  width: string;
  tight?: boolean;
}) {
  return (
    <View style={{ width: width as never }} className={cn("border border-border", grahaClasses.columnCard)}>
      <View className={cn("flex-row", grahaClasses.columnHead)}>
        <Text className={grahaClasses.columnTitle}>
          {name}
          {note ? <Text className={grahaClasses.columnNote}> {note}</Text> : null}
        </Text>
        <Text className={grahaClasses.columnCount}>{count}</Text>
      </View>
      <View className={tight ? grahaClasses.columnBodyTight : grahaClasses.columnBody}>{children}</View>
    </View>
  );
}
