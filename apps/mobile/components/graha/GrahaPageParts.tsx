import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { GRAHA_PAGE_DESCRIPTIONS } from "@vedic-patro/domain/graha-detail-descriptions";
import { elementDescriptionBlocks } from "@vedic-patro/domain/panchanga-i18n";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/** Page banner — icon tile plus title and blurb, as on the web graha pages (`GrahaBanner`). */
export function GrahaBanner({
  icon,
  title,
  blurb,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  blurb: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
      className="mb-4 overflow-hidden rounded-2xl border px-5 py-5"
    >
      <View className="flex-row items-start gap-4">
        <View
          style={{ backgroundColor: colorWithAlpha("#0b565a", 0.15) }}
          className="h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        >
          <Ionicons name={icon} size={24} color={colors.secondary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-title font-bold text-foreground"
            style={nepaliTextStyle(20)}
          >
            {title}
          </Text>
          <Text
            className="text-body mt-1 leading-relaxed text-muted-foreground"
            style={nepaliTextStyle(14)}
          >
            {blurb}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** "About" block — what / how / meaning, keyed by graha page id. */
export function GrahaDescription({ pageId }: { pageId: string }) {
  const { lang, pick, t } = useLocale();
  const colors = useThemeColors();
  const desc = GRAHA_PAGE_DESCRIPTIONS[pageId];
  const blocks = desc
    ? (["what", "how", "meaning"] as const).map((section) => ({
        section,
        body: bilingualText(lang, desc[section].ne, desc[section].en),
      }))
    : [];
  if (!blocks.length) return null;

  return (
    <Card className="mt-6 gap-4 p-4">
      <Text
        style={{ color: colors.secondary, ...nepaliTextStyle(12) }}
        className="text-caption font-bold uppercase tracking-wider"
      >
        {pick("परिचय", "About")}
      </Text>
      {blocks.map((b) => (
        <View key={b.section} className="gap-1">
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
            {t(`element_page.section_${b.section}`)}
          </Text>
          <Text
            className="text-body leading-relaxed text-muted-foreground"
            style={nepaliTextStyle(14)}
          >
            {b.body}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** Element page "About" block — same content as web `ElementDescription`. */
export function ElementDescription({ elementId }: { elementId: string }) {
  const { lang, pick, t } = useLocale();
  const colors = useThemeColors();
  const blocks = elementDescriptionBlocks(elementId, lang);
  if (!blocks.length) return null;

  return (
    <Card className="mt-6 gap-4 p-4">
      <Text
        style={{ color: colors.secondary, ...nepaliTextStyle(12) }}
        className="text-caption font-bold uppercase tracking-wider"
      >
        {pick("परिचय", "About")}
      </Text>
      {blocks.map((b) => (
        <View key={b.section} className="gap-1">
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(14)}>
            {t(`element_page.section_${b.section}`)}
          </Text>
          <Text
            className="text-body leading-relaxed text-muted-foreground"
            style={nepaliTextStyle(14)}
          >
            {b.body}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** Trailing "← all panchanga elements" link shared by the graha pages. */
export function AllElementsLink() {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/panchanga/details" as never)}
      className="mt-6 flex-row items-center gap-1.5 self-start"
    >
      <Ionicons name="grid-outline" size={14} color={colors.primary} />
      <Text style={{ color: colors.primary }} className="text-body underline">
        {pick("सबै पञ्चाङ्ग तत्त्वहरू", "All panchanga elements")}
      </Text>
    </Pressable>
  );
}

/** Card shell used by the per-graha columns on the asta / vakri pages. */
export function GrahaColumnCard({
  name,
  note,
  count,
  children,
  width,
}: {
  name: string;
  note?: string;
  count: string;
  children: React.ReactNode;
  width: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{ width: width as never, borderColor: colors.border }}
      className="mb-3 overflow-hidden rounded-xl border bg-card"
    >
      <View
        style={{ backgroundColor: colorWithAlpha("#0b565a", 0.09) }}
        className="flex-row items-baseline justify-between gap-2 border-b border-border px-3 py-2"
      >
        <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
          {name}
          {note ? (
            <Text className="text-caption font-normal text-muted-foreground"> {note}</Text>
          ) : null}
        </Text>
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
          {count}
        </Text>
      </View>
      <View className="gap-2 p-2">{children}</View>
    </View>
  );
}
