import { View } from "react-native";
import { useLegalPage, type LegalKind } from "@vedic-patro/features/legal";
import { legalClasses } from "@vedic-patro/design-tokens/classes/legal-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useThemeColors } from "@/lib/theme-context";
import { Ionicons } from "@/components/icons/Ionicons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Text } from "@/components/ui/Text";
import { AppShell } from "@/components/AppShell";
import { nepaliTextStyle } from "@/lib/nepali-text";

/** Privacy / terms — the app's drawing of `useLegalPage` (@vedic-patro/features). */
function LegalDocument({ kind }: { kind: LegalKind }) {
  const page = useLegalPage(kind);
  const colors = useThemeColors();
  return (
    <AppShell title={page.title} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<Ionicons name={kind === "privacy" ? "shield-outline" : "document-text-outline"} size={24} color={colors.secondary} />}
          title={page.title}
          subtitle={page.updated}
        />
        <View className={cn("w-full gap-8", legalClasses.wrap)}>
          <Text className={cn(legalClasses.text, legalClasses.intro)} style={nepaliTextStyle()}>
            {page.intro}
          </Text>
          {page.sections.map((section) => (
            <View key={section.key} className="gap-3">
              <Text className={legalClasses.heading} style={nepaliTextStyle()}>
                {section.heading}
              </Text>
              {section.paragraphs.map((para) => (
                <Text key={para.key} className={cn(legalClasses.text, legalClasses.para)} style={nepaliTextStyle()}>
                  {para.text}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

export function PrivacyDocument() {
  return <LegalDocument kind="privacy" />;
}

export function TermsDocument() {
  return <LegalDocument kind="terms" />;
}
