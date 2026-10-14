import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useSaitRules } from "@vedic-patro/features/sait";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 */
export function SaitRulesSection({
  busy = false,
  ...props
}: {
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRuleEntry[] | null;
  engineVersion?: string;
  defaultOpen?: boolean;
  /** Ids currently applied. A toggleable rule not listed here is treated as ON. */
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  /** Recomputing indicator while a custom-rule fetch is in flight. */
  busy?: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const view = useSaitRules(props);
  if (!view) return null;

  const cols = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <View className={saitClasses.rulesCard}>
      <Pressable onPress={view.toggle} className={cn(saitClasses.rulesHead, "active:opacity-80")}>
        <Ionicons name="document-text-outline" size={16} color={colors.secondary} />
        <View className={saitClasses.rulesHeadText}>
          <Text className={saitClasses.rulesTitle} style={nepaliTextStyle()}>
            {view.title}
          </Text>
          <Text className={saitClasses.rulesSubtitle} style={nepaliTextStyle()}>
            {view.subtitle}
          </Text>
        </View>
        {busy ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
        <Ionicons name={view.open ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
      </Pressable>

      {view.open ? (
        <View className={saitClasses.rulesBody}>
          {view.intro ? (
            <Text className={saitClasses.rulesIntro} style={nepaliTextStyle()}>
              {view.intro}
            </Text>
          ) : null}

          {view.hint ? (
            <View className={saitClasses.rulesHint}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text className={cn("flex-1", saitClasses.rulesHintText)} style={nepaliTextStyle()}>
                {view.hint}
              </Text>
            </View>
          ) : null}

          {view.rules.length > 0 ? (
            <View className={cn("flex-row flex-wrap", saitClasses.ruleList)}>
              {view.rules.map((r) => (
                <View key={r.key} style={{ width: cardWidth as never }} className={cn(saitClasses.rule, r.off ? saitClasses.ruleOff : saitClasses.ruleOn)}>
                  <View className={saitClasses.ruleHead}>
                    <View className={saitClasses.ruleNum}>
                      <Text className={saitClasses.ruleNumText} style={nepaliTextStyle()}>
                        {r.num}
                      </Text>
                    </View>
                    <Text className={cn(saitClasses.ruleText, r.off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn)} style={nepaliTextStyle()}>
                      {r.text}
                    </Text>
                    {r.toggleable ? (
                      <Switch
                        value={r.enabled}
                        onValueChange={r.setEnabled}
                        accessibilityLabel={view.switchLabel}
                        trackColor={{ true: colors.secondary }}
                      />
                    ) : null}
                  </View>

                  {r.shloka || r.source || r.gloss ? (
                    <View className={cn(saitClasses.ruleDetail, r.off && saitClasses.ruleDetailOff)}>
                      {r.source ? (
                        <Text className={saitClasses.ruleSource} style={nepaliTextStyle()}>
                          {r.source}
                        </Text>
                      ) : null}
                      {r.shloka ? (
                        <Text className={saitClasses.ruleShloka} style={nepaliTextStyle()}>
                          {r.shloka}
                        </Text>
                      ) : null}
                      {r.gloss ? (
                        <Text className={saitClasses.ruleGloss} style={nepaliTextStyle()}>
                          {r.gloss}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {view.engine ? (
            <View className={saitClasses.engine}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text className={saitClasses.engineText} style={nepaliTextStyle()}>
                {view.engine}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default SaitRulesSection;
