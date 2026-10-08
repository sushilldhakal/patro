import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

export function LoadingState({ label }: { label?: string }) {
  const { pick } = useLocale();
  return (
    <View className="flex-1 items-center justify-center py-12">
      <VedicPatroLoader label={label ?? pick("लोड हुँदैछ…", "Loading…")} size={88} />
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
  const { pick } = useLocale();
  return (
    <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <Text className="text-sm text-destructive">
        {message ?? pick("डाटा लोड गर्न सकिएन।", "Could not load data.")}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-3 self-start rounded-lg bg-primary px-4 py-2">
          <Text className="text-sm font-semibold text-primary-foreground">
            {pick("पुनः प्रयास", "Retry")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
