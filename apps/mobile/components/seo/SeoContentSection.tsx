import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { translateList, useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { toNepaliDigits } from "@/lib/panchanga-format";

type SeoRoute = "converter" | "panchanga" | "holidays";

/** Same year variables web's `seoYearVars` feeds the SEO copy. */
function seoYearVars(now: Date = new Date()): Record<string, string> {
  const adYear = now.getFullYear();
  const afterNewYear = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 14);
  const bsYear = adYear + (afterNewYear ? 57 : 56);
  return { adYear: String(adYear), bsYear: String(bsYear), bsYearNe: toNepaliDigits(bsYear) };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, k: string) => vars[k] ?? whole);
}

/**
 * The intro paragraphs + FAQ that close Converter, Panchanga and Holidays on
 * web (`SeoContentSection`) — same `seo_faq.*` strings.
 */
export function SeoContentSection({ route }: { route: SeoRoute }) {
  const { lang, t } = useLocale();
  const vars = seoYearVars();
  const paragraphs = translateList<string>(lang, `seo_faq.${route}.intro`).map((p) => fill(p, vars));

  const faqs: { q: string; a: string }[] = [];
  for (let i = 0; i < 8; i += 1) {
    const q = t(`seo_faq.${route}.items.${i}.q`, vars);
    const a = t(`seo_faq.${route}.items.${i}.a`, vars);
    if (!q || !a || q.startsWith("seo_faq.") || a.startsWith("seo_faq.")) break;
    faqs.push({ q, a });
  }

  if (paragraphs.length === 0 && faqs.length === 0) return null;

  return (
    <View className="mt-8 gap-6 border-t border-border pt-8">
      {paragraphs.length > 0 ? (
        <View className="gap-3">
          {paragraphs.map((p, i) => (
            <Text key={i} className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(15)}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}
      {faqs.length > 0 ? (
        <View className="gap-4">
          <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
            {t("seo_faq.section_title")}
          </Text>
          {faqs.map((f) => (
            <View key={f.q}>
              <Text className="font-semibold text-foreground" style={nepaliTextStyle(15)}>
                {f.q}
              </Text>
              <Text className="text-body mt-1 leading-relaxed text-muted-foreground" style={nepaliTextStyle(15)}>
                {f.a}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
