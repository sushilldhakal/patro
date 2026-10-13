import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import { translateKey } from "@vedic-patro/domain/locale";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

/** A rule with its catalogue keys resolved into both languages. */
interface ResolvedRule {
  id?: string;
  ne: string;
  en: string;
  source?: { ne: string; en: string };
  shloka?: string;
  gloss?: { ne: string; en: string };
}

function resolveRule(r: SaitRuleEntry): ResolvedRule {
  const both = (key: string) => ({ ne: translateKey(key, "ne"), en: translateKey(key, "en") });
  return {
    id: r.id,
    ...both(r.text),
    source: r.source ? both(r.source) : undefined,
    shloka: r.shloka,
    gloss: r.gloss ? both(r.gloss) : undefined,
  };
}

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 */
export function SaitRulesSection({
  method,
  rules: ruleEntries,
  engineVersion,
  defaultOpen = false,
  enabledRuleIds,
  onToggleRule,
  busy = false,
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
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const [open, setOpen] = useState(defaultOpen);

  const rules = useMemo(() => ruleEntries?.map(resolveRule), [ruleEntries]);
  const intro = method ? pick(method.ne ?? "", method.en ?? "") : "";
  if (!intro && (!rules || rules.length === 0)) return null;

  const ruleCount = rules?.length ?? 0;
  const togglingEnabled = Boolean(onToggleRule);
  const offCount = togglingEnabled
    ? (rules ?? []).filter((r) => r.id && !(enabledRuleIds?.has(r.id) ?? true)).length
    : 0;
  const cols = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <View className={saitClasses.rulesCard}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className={cn(saitClasses.rulesHead, "active:opacity-80")}
      >
        <Ionicons name="document-text-outline" size={16} color={colors.secondary} />
        <View className={saitClasses.rulesHeadText}>
          <Text className={saitClasses.rulesTitle} style={nepaliTextStyle()}>
            {pick("यो सूची कसरी बनेको हो", "How this list is generated")}
          </Text>
          <Text className={saitClasses.rulesSubtitle} style={nepaliTextStyle()}>
            {offCount > 0
              ? pick(
                  `${digits(ruleCount)} मध्ये ${digits(offCount)} नियम हटाइएको`,
                  `${offCount} of ${ruleCount} rules switched off`,
                )
              : togglingEnabled
                ? pick(
                    `${digits(ruleCount)} शास्त्रीय नियम · आफ्नो परम्परा अनुसार अफ गर्न मिल्ने`,
                    `${ruleCount} classical rules · switch off any your tradition skips`,
                  )
                : pick(
                    `${digits(ruleCount)} शास्त्रीय नियम · स्रोतसहित`,
                    `${ruleCount} classical rules · with sources`,
                  )}
          </Text>
        </View>
        {busy ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className={saitClasses.rulesBody}>
          {intro ? (
            <Text className={saitClasses.rulesIntro} style={nepaliTextStyle()}>
              {intro}
            </Text>
          ) : null}

          {togglingEnabled ? (
            <View className={saitClasses.rulesHint}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text className={cn("flex-1", saitClasses.rulesHintText)} style={nepaliTextStyle()}>
                {t("sait.switch_off_a_rule_your_community_doesn_t_follow_the_dat")}
              </Text>
            </View>
          ) : null}

          {rules && rules.length > 0 ? (
            <View className={cn("flex-row flex-wrap", saitClasses.ruleList)}>
              {rules.map((r, i) => {
                const toggleable = Boolean(r.id && togglingEnabled);
                const enabled = r.id ? (enabledRuleIds?.has(r.id) ?? true) : true;
                const off = toggleable && !enabled;
                return (
                <View
                  key={r.id ?? i}
                  style={{ width: cardWidth as never }}
                  className={cn(saitClasses.rule, off ? saitClasses.ruleOff : saitClasses.ruleOn)}
                >
                  <View className={saitClasses.ruleHead}>
                    <View className={saitClasses.ruleNum}>
                      <Text className={saitClasses.ruleNumText} style={nepaliTextStyle()}>
                        {digits(i + 1)}
                      </Text>
                    </View>
                    <Text
                      className={cn(saitClasses.ruleText, off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn)}
                      style={nepaliTextStyle()}
                    >
                      {pick(r.ne, r.en)}
                    </Text>
                    {toggleable ? (
                      <Switch
                        value={enabled}
                        onValueChange={(v) => {
                          if (r.id) onToggleRule?.(r.id, v);
                        }}
                        trackColor={{ true: colors.secondary }}
                      />
                    ) : null}
                  </View>

                  {r.shloka || r.source || r.gloss ? (
                    <View className={cn(saitClasses.ruleDetail, off && saitClasses.ruleDetailOff)}>
                      {r.source ? (
                        <Text className={saitClasses.ruleSource} style={nepaliTextStyle()}>
                          {pick(r.source.ne, r.source.en)}
                        </Text>
                      ) : null}
                      {r.shloka ? (
                        <Text className={saitClasses.ruleShloka} style={nepaliTextStyle()}>
                          {r.shloka}
                        </Text>
                      ) : null}
                      {r.gloss ? (
                        <Text className={saitClasses.ruleGloss} style={nepaliTextStyle()}>
                          {pick(r.gloss.ne, r.gloss.en)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                );
              })}
            </View>
          ) : null}

          {engineVersion ? (
            <View className={saitClasses.engine}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text className={saitClasses.engineText} style={nepaliTextStyle()}>
                {pick("मुहूर्त इन्जिन", "Muhurta engine")} {engineVersion}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default SaitRulesSection;
