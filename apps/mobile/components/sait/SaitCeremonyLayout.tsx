import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SaitCeremonyLayout as Shared } from "@vedic-patro/ui/kit/jyotish";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import { Text } from "@/components/ui/Text";
import type { BratabandhaNakshatraMode, SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { type Era } from "@vedic-patro/domain/era";
import { useThemeColors } from "@/lib/theme-context";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { Box } from "@vedic-patro/ui";

/** Page shell, year bar and the back link stay here. The list is shared. */
export function SaitCeremonyLayout({
  title, subtitle, era, onEraChange, year, onYearChange, location, onLocationChange,
  method, rules, engineVersion, enabledRuleIds, onToggleRule, rulesBusy, nakshatraMode, onNakshatraModeChange,
  count, notice, children, days, profileControl, suitabilityByDay, personalizeByDay, loading, emptyLabel, countLabel, footer,
}: {
  title: string;
  subtitle: string;
  era: Era;
  onEraChange: (era: Era) => void;
  year: number;
  onYearChange: (year: number) => void;
  location: PanchangaLocation;
  onLocationChange: (loc: PanchangaLocation) => void;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRuleEntry[] | null;
  engineVersion?: string;
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  rulesBusy?: boolean;
  nakshatraMode?: BratabandhaNakshatraMode | null;
  onNakshatraModeChange?: (mode: BratabandhaNakshatraMode) => void;
  count?: number;
  notice?: ReactNode;
  children?: ReactNode;
  days?: SaitDetailDay[];
  profileControl?: ReactNode;
  suitabilityByDay?: Map<string, SaitSuitability>;
  personalizeByDay?: Map<string, SaitPersonalizeDay>;
  loading: boolean;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
  footer?: ReactNode;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const { t } = useLocale();
  return (
    <Shared
      year={year}
      method={method}
      rules={rules}
      engineVersion={engineVersion}
      enabledRuleIds={enabledRuleIds}
      onToggleRule={onToggleRule}
      rulesBusy={rulesBusy}
      nakshatraMode={nakshatraMode}
      onNakshatraModeChange={onNakshatraModeChange}
      days={days}
      count={count}
      profileControl={profileControl}
      suitabilityByDay={suitabilityByDay}
      personalizeByDay={personalizeByDay}
      loading={loading}
      notice={notice}
      emptyLabel={emptyLabel}
      countLabel={countLabel}
      footer={footer}
      renderShell={(body) => (
        <AppShell title={title} showHeader={false}>
          <Box className="gap-8">{body}</Box>
        </AppShell>
      )}
      renderHeader={() => <PageHeader icon={<AppNavIcon name="heart-handshake" size={24} color={colors.secondary} />} title={title} subtitle={subtitle} />}
      renderYearNav={() => (
        <PatroYearNavBlock era={era} onEraChange={onEraChange} year={year} onYearChange={onYearChange} location={location} onLocationChange={onLocationChange} className="" />
      )}
      renderBack={() => (
        <Pressable onPress={() => router.push("/panchanga/details" as never)} className="flex-row items-center gap-1.5 self-start">
          <Ionicons name="grid-outline" size={14} color={colors.primary} />
          <Text className="text-sm text-primary underline" style={nepaliTextStyle()}>{t("sait.all_ceremonies")}</Text>
        </Pressable>
      )}
    >
      {children}
    </Shared>
  );
}

export default SaitCeremonyLayout;
