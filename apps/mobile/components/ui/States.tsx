import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

/** Smallest height a loading block keeps, so it never collapses to nothing in a scroll view. */
const LOADING_MIN_HEIGHT = 200;

/**
 * The page-level "loading" block: the animated Vedic Patro mark, centred. It
 * keeps a fixed minimum height, so the cards below sit where they will be once
 * the data arrives instead of sliding up under (or over) it.
 */
export function LoadingState({ label }: { label?: string | null }) {
  const { t } = useLocale();
  return (
    <View className="flex-1 items-center justify-center py-10" style={{ minHeight: LOADING_MIN_HEIGHT }}>
      <VedicPatroLoader label={label === undefined ? t("rashifal.profile.loading") : label} size={88} />
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
