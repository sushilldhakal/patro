import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

export function LoadingState({ label }: { label?: string }) {
  const { t, pick } = useLocale();
  return (
    <View className="flex-1 items-center justify-center py-12">
      <VedicPatroLoader label={label ?? t("rashifal.profile.loading")} size={88} />
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t, pick } = useLocale();
  return (
    <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <Text className="text-body text-destructive">
        {message ?? t("ui.ui.could_not_load_data")}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-3 self-start rounded-lg bg-primary px-4 py-2">
          <Text className="text-body font-semibold text-primary-foreground">
            {t("ui.common.retry")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
