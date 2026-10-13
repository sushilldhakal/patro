import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { MuhurtaNowBlock, PanchangaDay } from "@/lib/api";
import { formatTimeShort } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { useLocale } from "@/lib/i18n";
import { windowLabel } from "@vedic-patro/domain/muhurta-now";

const ROWS: { key: keyof NonNullable<PanchangaDay["muhurta_now"]>; label: string; labelEn: string }[] =
  [
    { key: "rahu_kalam", label: "राहु काल", labelEn: "Rahu Kalam" },
    { key: "yamaganda", label: "यमगण्ड", labelEn: "Yamaganda" },
    { key: "gulika", label: "गुलिक", labelEn: "Gulika" },
    { key: "abhijit", label: "अभिजित", labelEn: "Abhijit" },
  ];

type Props = {
  p: PanchangaDay;
  clock?: string;
};

export function MuhurtaNowPanel({ p, clock }: Props) {
  const { pick, digits } = useLocale();
  const now = p.muhurta_now;
  if (!now) return null;

  const instantLabel = p.query_instant_local ?? clock;
  const instantTime = instantLabel ? (instantLabel.split(" ")[1] ?? instantLabel) : "";

  return (
    <View className={panchangaPageClasses.aside.card}>
      <Text className={panchangaPageClasses.aside.muhurtaEyebrow}>
        {pick("क्षणिक मुहूर्त", "Muhurta now")}
      </Text>
      {instantLabel ? (
        <Text className={panchangaPageClasses.aside.muhurtaInstant}>
          {pick(`${digits(instantTime)} बजेको अवस्था`, `Status at ${digits(instantTime)}`)}
        </Text>
      ) : null}
      <View className={panchangaPageClasses.aside.muhurtaList}>
        {ROWS.map(({ key, label, labelEn }) => {
          const block = now[key];
          const active = block?.active;
          const range = windowLabel(block, digits);
          return (
            <View
              key={key}
              className={cn(
                "flex-row",
                panchangaPageClasses.aside.muhurtaRow,
                active ? panchangaPageClasses.aside.muhurtaRowActive : panchangaPageClasses.aside.muhurtaRowIdle,
              )}
            >
              <Text className={panchangaPageClasses.aside.muhurtaLabel}>{pick(label, labelEn)}</Text>
              <Text className={panchangaPageClasses.aside.muhurtaValue}>
                {active ? (
                  <Text className={panchangaPageClasses.aside.muhurtaActive}>
                    {pick("सक्रिय", "Active")}
                  </Text>
                ) : (
                  <Text className={panchangaPageClasses.aside.muhurtaRange}>{range ?? "—"}</Text>
                )}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function EphemerisModeBanner({ p, clock }: Props) {
  const { pick, digits } = useLocale();
  const time = p.query_instant_local?.split(" ")[1] ?? clock;
  const civil = p.before_sunrise_of_civil_day;
  return (
    <View className={panchangaPageClasses.aside.banner}>
      <Text className={panchangaPageClasses.aside.bannerTitle}>
        {pick("समय-आधारित पञ्चाङ्ग", "Time-based reading")}
      </Text>
      <Text className={panchangaPageClasses.aside.bannerBody}>
        {time
          ? pick(
              `${digits(time)} बजेको वास्तविक ग्रहस्थितिअनुसार तिथि, नक्षत्र, योग र करण। आकाशगङ्गाका ग्रहहरूको सटीक गणनामा आधारित भएकाले मुद्रित सिद्धान्तिक पात्रोसँग केही मात्रामा नमिल्न सक्छ।`,
              `Tithi, nakshatra, yoga and karana from the actual planetary positions at ${digits(time)}. Based on precise sky calculations, so it may differ slightly from printed theoretical patros.`,
            )
          : pick(
              "तोकिएको समयको वास्तविक ग्रहस्थितिअनुसार तिथि, नक्षत्र, योग र करण। आकाशगङ्गाका ग्रहहरूको सटीक गणनामा आधारित भएकाले मुद्रित सिद्धान्तिक पात्रोसँग केही मात्रामा नमिल्न सक्छ।",
              "Tithi, nakshatra, yoga and karana from the actual planetary positions at the chosen time. Based on precise sky calculations, so it may differ slightly from printed theoretical patros.",
            )}
        {civil
          ? pick(
              " यो समय आजको सूर्योदय अघि भएकाले हिजोको वैदिक दिनको पञ्चाङ्ग देखाइँदैछ।",
              " This time is before today's sunrise, so the previous Vedic day's panchanga is shown.",
            )
          : null}
      </Text>
    </View>
  );
}
