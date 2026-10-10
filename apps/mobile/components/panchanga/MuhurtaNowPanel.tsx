import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { MuhurtaNowBlock, PanchangaDay } from "@/lib/api";
import { formatTimeShort } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale } from "@/lib/i18n";

function windowLabel(
  block: MuhurtaNowBlock | null | undefined,
  digits: (v: string | number) => string,
): string | undefined {
  if (!block) return undefined;
  const start = formatTimeShort(block.start_time ?? block.start_local);
  const end = formatTimeShort(block.end_time ?? block.end_local);
  if (start && end) return `${digits(start)} – ${digits(end)}`;
  return start ? digits(start) : undefined;
}

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
    <View className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Text className="text-caption mb-1 uppercase tracking-[0.12em] text-muted-foreground">
        {pick("क्षणिक मुहूर्त", "Muhurta now")}
      </Text>
      {instantLabel ? (
        <Text className="text-body mb-3 text-foreground">
          {pick(`${digits(instantTime)} बजेको अवस्था`, `Status at ${digits(instantTime)}`)}
        </Text>
      ) : null}
      <View className="gap-2">
        {ROWS.map(({ key, label, labelEn }) => {
          const block = now[key];
          const active = block?.active;
          const range = windowLabel(block, digits);
          return (
            <View
              key={key}
              className={cn(
                "flex-row items-center justify-between gap-2 rounded-lg px-2.5 py-2",
                active ? "bg-secondary/20" : "bg-muted/40",
              )}
            >
              <Text className="text-body font-semibold text-foreground">{pick(label, labelEn)}</Text>
              <Text className="text-body shrink-0 text-right font-semibold">
                {active ? (
                  <Text className="text-caption font-bold uppercase tracking-wide text-secondary">
                    {pick("सक्रिय", "Active")}
                  </Text>
                ) : (
                  <Text className="text-caption font-mono">{range ?? "—"}</Text>
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
    <View className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
      <Text className="text-body font-semibold text-foreground">
        {pick("समय-आधारित पञ्चाङ्ग", "Time-based reading")}
      </Text>
      <Text className="text-body mt-1 leading-relaxed text-foreground">
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
