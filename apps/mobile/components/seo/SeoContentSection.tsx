import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useSeoContentSection, type SeoContentRoute } from "@vedic-patro/features/common";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { seoClasses } from "@vedic-patro/design-tokens/classes/seo-classes";

/**
 * The intro paragraphs + FAQ that close Converter, Panchanga and Holidays on
 * web (`SeoContentSection`) — same `seo_faq.*` strings.
 */
export function SeoContentSection({ route }: { route: SeoContentRoute }) {
  const { empty, paragraphs, faqTitle, faqs } = useSeoContentSection(route);

  if (empty) return null;

  return (
    <View className="mt-8 gap-6 border-t border-border pt-8">
      {paragraphs.length > 0 ? (
        <View className="gap-3">
          {paragraphs.map((p, i) => (
            <Text key={i} className={seoClasses.introParagraph} style={nepaliTextStyle(15)}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}
      {faqs.length > 0 ? (
        <View className="gap-4">
          <Text className={seoClasses.faqTitle} style={nepaliTextStyle(18)}>
            {faqTitle}
          </Text>
          {faqs.map((f) => (
            <View key={f.q}>
              <Text className={seoClasses.question} style={nepaliTextStyle(15)}>
                {f.q}
              </Text>
              <Text className={cn("mt-1", seoClasses.answer)} style={nepaliTextStyle(15)}>
                {f.a}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
