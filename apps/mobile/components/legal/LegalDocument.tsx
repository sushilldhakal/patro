import { View } from "react-native";
import { useThemeColors } from "@/lib/theme-context";
import { Ionicons } from "@/components/icons/Ionicons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Text } from "@/components/ui/Text";
import { AppShell } from "@/components/AppShell";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { legalClasses } from "@vedic-patro/design-tokens/classes/legal-classes";
import { cn } from "@vedic-patro/domain/utils";
import {
  LEGAL_UPDATED,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  TERMS_INTRO,
  TERMS_SECTIONS,
  type LegalSection,
} from "@vedic-patro/domain/legal-copy";

function LegalBody({
  intro,
  sections,
}: {
  intro: { ne: string; en: string };
  sections: LegalSection[];
}) {
  const { pick } = useLocale();
  return (
    <View className={cn("w-full gap-8", legalClasses.wrap)}>
      <Text className={cn(legalClasses.text, legalClasses.intro)} style={nepaliTextStyle()}>
        {pick(intro.ne, intro.en)}
      </Text>
      {sections.map((section) => (
        <View key={section.heading.en} className="gap-3">
          <Text className={legalClasses.heading} style={nepaliTextStyle()}>
            {pick(section.heading.ne, section.heading.en)}
          </Text>
          {section.body.map((para) => (
            <Text
              key={para.en}
              className={cn(legalClasses.text, legalClasses.para)}
              style={nepaliTextStyle()}
            >
              {pick(para.ne, para.en)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function PrivacyDocument() {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <AppShell title={t("legal.privacy_title")} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<Ionicons name="shield-outline" size={24} color={colors.secondary} />}
          title={t("legal.privacy_title")}
          subtitle={t("legal.updated", { date: LEGAL_UPDATED })}
        />
        <LegalBody intro={PRIVACY_INTRO} sections={PRIVACY_SECTIONS} />
      </View>
    </AppShell>
  );
}

export function TermsDocument() {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <AppShell title={t("legal.terms_title")} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<Ionicons name="document-text-outline" size={24} color={colors.secondary} />}
          title={t("legal.terms_title")}
          subtitle={t("legal.updated", { date: LEGAL_UPDATED })}
        />
        <LegalBody intro={TERMS_INTRO} sections={TERMS_SECTIONS} />
      </View>
    </AppShell>
  );
}
