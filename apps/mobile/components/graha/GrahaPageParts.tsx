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
import { useThemeColors } from "@/lib/theme-context";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";

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
    <View className={cn("mb-4", grahaClasses.banner)}>
      <View className={cn("flex-row", grahaClasses.bannerRow)}>
        <View className={grahaClasses.bannerIcon}>
          <Ionicons name={icon} size={24} color={colors.secondary} />
        </View>
        <View className={cn("flex-1", grahaClasses.bannerText)}>
          <Text className={grahaClasses.bannerTitle} style={nepaliTextStyle(20)}>
            {title}
          </Text>
          <Text className={grahaClasses.bannerBlurb} style={nepaliTextStyle(14)}>
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
  const desc = GRAHA_PAGE_DESCRIPTIONS[pageId];
  const blocks = desc
    ? (["what", "how", "meaning"] as const).map((section) => ({
        section,
        body: bilingualText(lang, desc[section].ne, desc[section].en),
      }))
    : [];
  if (!blocks.length) return null;

  return (
    <Card className={grahaClasses.aboutCard}>
      <Text className={grahaClasses.aboutTitle} style={nepaliTextStyle(12)}>
        {pick("परिचय", "About")}
      </Text>
      <View className={grahaClasses.aboutBody}>
        {blocks.map((b) => (
          <View key={b.section} className={grahaClasses.aboutBlock}>
            <Text className={grahaClasses.aboutBlockTitle} style={nepaliTextStyle(14)}>
              {t(`element_page.section_${b.section}`)}
            </Text>
            <Text className={grahaClasses.aboutBlockText} style={nepaliTextStyle(14)}>
              {b.body}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Element page "About" block — same content as web `ElementDescription`. */
export function ElementDescription({ elementId }: { elementId: string }) {
  const { lang, pick, t } = useLocale();
  const blocks = elementDescriptionBlocks(elementId, lang);
  if (!blocks.length) return null;

  return (
    <Card className={grahaClasses.aboutCard}>
      <Text className={grahaClasses.aboutTitle} style={nepaliTextStyle(12)}>
        {pick("परिचय", "About")}
      </Text>
      <View className={grahaClasses.aboutBody}>
        {blocks.map((b) => (
          <View key={b.section} className={grahaClasses.aboutBlock}>
            <Text className={grahaClasses.aboutBlockTitle} style={nepaliTextStyle(14)}>
              {t(`element_page.section_${b.section}`)}
            </Text>
            <Text className={grahaClasses.aboutBlockText} style={nepaliTextStyle(14)}>
              {b.body}
            </Text>
          </View>
        ))}
      </View>
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
      className={cn(grahaClasses.detailsLink, "flex-row")}
    >
      <Ionicons name="grid-outline" size={14} color={colors.primary} />
      <Text style={{ color: colors.primary }} className="text-sm underline">
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
  tight,
}: {
  name: string;
  note?: string;
  count: string;
  children: React.ReactNode;
  width: string;
  /** Dense body for the vakri rows. */
  tight?: boolean;
}) {
  return (
    <View
      style={{ width: width as never }}
      className={cn("border border-border", grahaClasses.columnCard)}
    >
      <View className={cn("flex-row", grahaClasses.columnHead)}>
        <Text className={grahaClasses.columnTitle} style={nepaliTextStyle(16)}>
          {name}
          {note ? <Text className={grahaClasses.columnNote}> {note}</Text> : null}
        </Text>
        <Text className={grahaClasses.columnCount} style={nepaliTextStyle(11)}>
          {count}
        </Text>
      </View>
      <View className={tight ? grahaClasses.columnBodyTight : grahaClasses.columnBody}>{children}</View>
    </View>
  );
}
