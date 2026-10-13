import { Pressable, TextInput, View } from "react-native";
import { useConverterPage } from "@vedic-patro/features/converter";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Text } from "@/components/ui/Text";
import { convertAdToBs, convertBsToAd } from "@/lib/offline/convert-fallback";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { converterClasses } from "@vedic-patro/design-tokens/classes/converter-classes";

/**
 * Date converter — the app's drawing of `useConverterPage`
 * (@vedic-patro/features). Converts through the offline-capable fallback.
 */
export default function ConverterScreen() {
  const page = useConverterPage({ adToBs: convertAdToBs, bsToAd: convertBsToAd });
  const colors = useThemeColors();
  const { width } = useBreakpoint();

  // Web grid: grid-cols-2 / sm:grid-cols-3 / lg:grid-cols-4
  const cols = width >= 1024 ? 4 : width >= 640 ? 3 : 2;
  /* percent widths + a 12px gap: leave ~4% per gap or the last tile wraps. */
  const tileWidth = `${((100 - 4 * (cols - 1)) / cols).toFixed(2)}%`;

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <PatroPageHeader
        className="mb-8"
        icon={<AppNavIcon name="arrow-left-right" size={24} color={colors.secondary} />}
        title={page.copy.title}
        subtitle={page.copy.subtitle}
      />

      <View className={cn("mb-8 flex-row self-start", converterClasses.modeToggle)}>
        {page.modes.map((m) => {
          const tone = m.active ? converterClasses.modeLabelActive : converterClasses.modeLabelIdle;
          return (
            <Pressable
              key={m.id}
              onPress={() => page.setMode(m.id)}
              className={cn("flex-row active:opacity-80", converterClasses.modeButton, m.active && converterClasses.modeButtonActive)}
            >
              <Text className={cn(converterClasses.modeLabel, tone)}>{m.from}</Text>
              <Ionicons name="arrow-forward" size={14} color={m.active ? inkOn(colors.secondary) : colors.foreground} />
              <Text className={cn(converterClasses.modeLabel, tone)}>{m.to}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className={cn("mb-8 flex-row flex-wrap", converterClasses.form)}>
        <View className={converterClasses.field}>
          <Text className={converterClasses.label} style={nepaliTextStyle()}>
            {page.copy.inputLabel}
          </Text>
          <TextInput
            value={page.input}
            onChangeText={page.setInput}
            onSubmitEditing={page.submit}
            placeholder={page.copy.placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            className={converterClasses.input}
          />
        </View>
        <Button
          label={page.copy.convert}
          variant="secondary"
          className={cn("h-auto", converterClasses.submit)}
          textClassName={converterClasses.submitLabel}
          onPress={page.submit}
        />
      </View>

      {page.status === "error" ? (
        <View className={cn("mb-8", converterClasses.errorBox)}>
          <Text className={converterClasses.errorText} style={nepaliTextStyle()}>
            {page.copy.error}
          </Text>
        </View>
      ) : null}

      {page.result ? (
        <View className="mb-8 gap-4">
          <View className={cn("flex-row", converterClasses.resultRow)}>
            <Text className={converterClasses.resultValue}>{page.result.from}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
            <Text className={converterClasses.resultValue}>{page.result.to}</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {page.result.cards.map((card) => (
              <StatCard key={card.labelKey} width={tileWidth} highlight={card.highlight} label={card.label} value={card.value} />
            ))}
          </View>
        </View>
      ) : null}
      <SeoContentSection route="converter" />
    </AppShell>
  );
}
