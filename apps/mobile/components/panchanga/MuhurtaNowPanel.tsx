import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { PanchangaDay } from "@/lib/api";
import { cn } from "@vedic-patro/domain/utils";
import { useEphemerisModeBanner, useMuhurtaNow } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  p: PanchangaDay;
  clock?: string;
  /** Civil AD date (YYYY-MM-DD) the user is viewing — not necessarily today. */
  viewedDateAd?: string;
};

export function MuhurtaNowPanel({ p, clock }: Props) {
  const card = useMuhurtaNow({ p, clock });
  if (!card) return null;

  return (
    <View className={panchangaPageClasses.aside.card}>
      <Text className={panchangaPageClasses.aside.muhurtaEyebrow}>{card.title}</Text>
      {card.instant ? <Text className={panchangaPageClasses.aside.muhurtaInstant}>{card.instant}</Text> : null}
      <View className={panchangaPageClasses.aside.muhurtaList}>
        {card.rows.map((row) => (
          <View
            key={row.key}
            className={cn(
              "flex-row",
              panchangaPageClasses.aside.muhurtaRow,
              row.active ? panchangaPageClasses.aside.muhurtaRowActive : panchangaPageClasses.aside.muhurtaRowIdle,
            )}
          >
            <Text className={panchangaPageClasses.aside.muhurtaLabel}>{row.label}</Text>
            <Text className={panchangaPageClasses.aside.muhurtaValue}>
              <Text className={row.active ? panchangaPageClasses.aside.muhurtaActive : panchangaPageClasses.aside.muhurtaRange}>
                {row.value}
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function EphemerisModeBanner({ p, clock, viewedDateAd }: Props) {
  const banner = useEphemerisModeBanner({ p, clock, viewedDateAd });
  return (
    <View className={panchangaPageClasses.aside.banner}>
      <Text className={panchangaPageClasses.aside.bannerTitle}>{banner.title}</Text>
      <Text className={panchangaPageClasses.aside.bannerBody}>
        {banner.body.map((run, i) => (
          <Text key={i} className={run.mono ? "font-mono tabular-nums" : undefined}>
            {run.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}
