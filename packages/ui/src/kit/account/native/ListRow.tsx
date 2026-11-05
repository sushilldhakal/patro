import { Children, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { Icon, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { ListGroupProps, ListRowProps } from "../contract";
import { ACCOUNT_ICONS, iconChevronRightList } from "../icons";

/** A titled group of rows on one rounded card, like a section of iOS Settings. */
export function ListGroup({ title, children }: ListGroupProps) {
  const items = Children.toArray(children).filter(Boolean) as ReactNode[];
  return (
    <View className="gap-2">
      {title ? <Text className={accountClasses.groupTitle}>{title}</Text> : null}
      <View className={accountClasses.groupCard}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View className={accountClasses.groupDivider} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

/** One row: a tinted icon, the title (and a line under it), then a value and a chevron or a trailing control. */
export function ListRow({ icon, title, subtitle, value, onPress, trailing, tone = "default" }: ListRowProps) {
  const danger = tone === "danger";
  const body = (
    <>
      <View className={cn(accountClasses.rowIcon, danger ? "bg-destructive" : "bg-secondary")}>
        <Icon node={ACCOUNT_ICONS[icon]} size={17} tone={danger ? "onPrimary" : "onSecondary"} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className={cn(accountClasses.rowTitle, danger && "text-destructive")} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text className={accountClasses.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? <Text className={accountClasses.rowValue} numberOfLines={1}>{value}</Text> : null}
      {trailing ?? (onPress ? <Icon node={iconChevronRightList} size={18} tone="muted" /> : null)}
    </>
  );
  if (!onPress) return <View className={accountClasses.row}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      className={cn(accountClasses.row, "active:bg-muted")}
    >
      {body}
    </Pressable>
  );
}
