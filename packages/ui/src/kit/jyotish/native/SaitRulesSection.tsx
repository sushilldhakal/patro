import { Pressable, useWindowDimensions, View } from "react-native";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useSaitRules } from "@vedic-patro/features/sait";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitRulesSectionProps } from "../contract";
import { iconChevronDown, iconInfo, iconLoader, iconScrollText } from "../icons";

function RuleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      className={cn(saitClasses.ruleSwitch, "mt-0.5", checked ? saitClasses.ruleSwitchOn : saitClasses.ruleSwitchOff)}
    >
      <View className={cn(saitClasses.ruleSwitchThumb, checked ? saitClasses.ruleSwitchThumbOn : saitClasses.ruleSwitchThumbOff)} />
    </Pressable>
  );
}

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 */
export function SaitRulesSection({ busy = false, ...props }: SaitRulesSectionProps) {
  const { width } = useWindowDimensions();
  const view = useSaitRules(props);
  if (!view) return null;

  const cols = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : (`${(100 / cols - 1.5).toFixed(2)}%` as `${number}%`);

  return (
    <Box className={saitClasses.rulesCard}>
      <Pressable
        onPress={view.toggle}
        accessibilityState={{ expanded: view.open }}
        className={cn(saitClasses.rulesHead, "active:opacity-80")}
      >
        <Icon node={iconScrollText} size="md" tone="secondary" />
        <Box className={saitClasses.rulesHeadText}>
          <Text className={saitClasses.rulesTitle}>{view.title}</Text>
          <Text className={saitClasses.rulesSubtitle}>{view.subtitle}</Text>
        </Box>
        {busy ? <Icon node={iconLoader} size="md" tone="secondary" /> : null}
        <Box nativeClassName={view.open ? "rotate-180" : undefined}>
          <Icon node={iconChevronDown} size="xl" tone="muted" />
        </Box>
      </Pressable>

      {view.open ? (
        <Box className={saitClasses.rulesBody}>
          {view.intro ? <Text className={saitClasses.rulesIntro}>{view.intro}</Text> : null}

          {view.hint ? (
            <Box className={saitClasses.rulesHint}>
              <Icon node={iconInfo} size="sm" tone="muted" />
              <Text className={cn("flex-1", saitClasses.rulesHintText)}>{view.hint}</Text>
            </Box>
          ) : null}

          {view.rules.length > 0 ? (
            <Box className={cn("flex-row flex-wrap", saitClasses.ruleList)}>
              {view.rules.map((r) => (
                <View
                  key={r.key}
                  style={{ width: cardWidth }}
                  className={cn(saitClasses.rule, r.off ? saitClasses.ruleOff : saitClasses.ruleOn)}
                >
                  <Box className={saitClasses.ruleHead}>
                    <Box className={saitClasses.ruleNum}>
                      <Text className={saitClasses.ruleNumText}>{r.num}</Text>
                    </Box>
                    <Text className={cn(saitClasses.ruleText, r.off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn)}>{r.text}</Text>
                    {r.toggleable ? <RuleSwitch checked={r.enabled} onChange={r.setEnabled} label={view.switchLabel} /> : null}
                  </Box>

                  {r.shloka || r.source || r.gloss ? (
                    <Box className={cn(saitClasses.ruleDetail, r.off && saitClasses.ruleDetailOff)}>
                      {r.source ? <Text className={saitClasses.ruleSource}>{r.source}</Text> : null}
                      {r.shloka ? <Text className={saitClasses.ruleShloka}>{r.shloka}</Text> : null}
                      {r.gloss ? <Text className={saitClasses.ruleGloss}>{r.gloss}</Text> : null}
                    </Box>
                  ) : null}
                </View>
              ))}
            </Box>
          ) : null}

          {view.engine ? (
            <Box className={saitClasses.engine}>
              <Icon node={iconInfo} size="sm" tone="muted" />
              <Text className={saitClasses.engineText}>{view.engine}</Text>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
