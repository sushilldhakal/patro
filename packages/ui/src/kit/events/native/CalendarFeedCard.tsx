import { ActivityIndicator, Pressable, View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Icon, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { CalendarFeedCardProps } from "../contract";
import { iconCalendarSync } from "../icons";

/**
 * "In Google or Apple Calendar": the signed-in user's private link, with a button for each
 * calendar app, share / copy, and a new link (two taps). The website draws the same card.
 */
export function CalendarFeedCard({ feed, onOpen, onCopy, copyMode, showApple }: CalendarFeedCardProps) {
  const { copy, links } = feed;
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      key={label}
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      className={cn("min-h-11 items-center justify-center rounded-full px-4 active:opacity-70", primary ? "bg-secondary" : "bg-background")}
    >
      <Text className={cn("text-body font-semibold", primary ? "text-secondary-foreground" : "text-foreground")}>{label}</Text>
    </Pressable>
  );

  return (
    <View className="gap-3 rounded-3xl bg-muted p-4 dark:bg-foreground/5">
      <View className="flex-row items-center gap-2">
        <Icon node={iconCalendarSync} size={20} tone="secondary" />
        <Text className="text-body font-semibold text-foreground">{copy.title}</Text>
      </View>
      <Text className="text-caption text-muted-foreground">{copy.body}</Text>
      {feed.loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator />
          <Text className="text-caption text-muted-foreground">{copy.loading}</Text>
        </View>
      ) : feed.failed || !links ? (
        <Pressable onPress={feed.retry} accessibilityRole="button" className="active:opacity-70">
          <Text className="text-caption text-destructive">{copy.failed}</Text>
        </Pressable>
      ) : (
        <>
          <View className="gap-2">
            {showApple ? button(copy.apple, () => onOpen(links.webcal), true) : null}
            {button(copy.google, () => onOpen(links.google), !showApple)}
            {button(feed.copied ? copy.copied : copyMode === "share" ? copy.shareLink : copy.copyLink, () => onCopy(links.https))}
          </View>
          <Text className="text-caption text-muted-foreground">{copy.privacy}</Text>
          <Pressable onPress={feed.reset} accessibilityRole="button" className="self-start active:opacity-70">
            <Text className={cn("text-caption font-semibold", feed.confirming ? "text-destructive" : "text-secondary")}>{copy.reset}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
