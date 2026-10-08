import { useState } from "react";
import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

export interface SaitRule {
  id?: string;
  ne: string;
  en: string;
  source?: { ne: string; en: string };
  /** Sanskrit verse (Devanāgarī) the rule derives from. */
  shloka?: string;
  gloss?: { ne: string; en: string };
}

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 */
export function SaitRulesSection({
  method,
  rules,
  engineVersion,
  defaultOpen = false,
  enabledRuleIds,
  onToggleRule,
  busy = false,
}: {
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
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
    <View className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
      >
        <Ionicons name="document-text-outline" size={16} color={colors.secondary} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(15)}>
            {pick("यो सूची कसरी बनेको हो", "How this list is generated")}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
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
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className="gap-4 border-t border-border px-4 py-4">
          {intro ? (
            <Text
              className="text-sm leading-relaxed text-foreground"
              style={nepaliTextStyle(14)}
            >
              {intro}
            </Text>
          ) : null}

          {togglingEnabled ? (
            <View className="flex-row items-start gap-1.5">
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text className="flex-1 text-xs leading-relaxed text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("sait.switch_off_a_rule_your_community_doesn_t_follow_the_dat")}
              </Text>
            </View>
          ) : null}

          {rules && rules.length > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {rules.map((r, i) => {
                const toggleable = Boolean(r.id && togglingEnabled);
                const enabled = r.id ? (enabledRuleIds?.has(r.id) ?? true) : true;
                const off = toggleable && !enabled;
                return (
                <View
                  key={r.id ?? i}
                  style={{
                    width: cardWidth as never,
                    backgroundColor: colors.surfaceInset,
                    borderColor: colors.border,
                    opacity: off ? 0.55 : 1,
                  }}
                  className="gap-2 rounded-lg border p-3.5"
                >
                  <View className="flex-row items-start gap-2">
                    <View
                      style={{ backgroundColor: colorWithAlpha("#0b565a", 0.15) }}
                      className="h-6 w-6 items-center justify-center rounded-md"
                    >
                      <Text
                        style={{ color: colors.secondary }}
                        className="font-num text-xs font-bold"
                      >
                        {digits(i + 1)}
                      </Text>
                    </View>
                    <Text
                      className="flex-1 text-sm font-semibold leading-snug text-foreground"
                      style={nepaliTextStyle(14)}
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
                    <View className="gap-1.5 border-t border-border pt-2.5">
                      {r.source ? (
                        <Text
                          className="text-xs font-semibold text-muted-foreground"
                          style={nepaliTextStyle(11)}
                        >
                          {pick(r.source.ne, r.source.en)}
                        </Text>
                      ) : null}
                      {r.shloka ? (
                        <Text
                          className="text-sm italic leading-relaxed text-foreground"
                          style={nepaliTextStyle(14)}
                        >
                          {r.shloka}
                        </Text>
                      ) : null}
                      {r.gloss ? (
                        <Text
                          className="text-xs leading-relaxed text-muted-foreground"
                          style={nepaliTextStyle(12)}
                        >
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
            <View className="flex-row items-center gap-1.5 pt-2">
              <Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
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
