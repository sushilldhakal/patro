import { Box, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useSaitRules } from "@vedic-patro/features/sait";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitRulesSectionProps } from "../contract";
import { iconChevronDown, iconInfo, iconLoader, iconScrollText } from "../icons";

function RuleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(saitClasses.ruleSwitch, "mt-0.5 transition-colors", checked ? saitClasses.ruleSwitchOn : saitClasses.ruleSwitchOff)}
    >
      <span className={cn(saitClasses.ruleSwitchThumb, "transition-all", checked ? saitClasses.ruleSwitchThumbOn : saitClasses.ruleSwitchThumbOff)} />
    </button>
  );
}

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 */
export function SaitRulesSection({ busy = false, ...props }: SaitRulesSectionProps) {
  const view = useSaitRules(props);
  if (!view) return null;

  return (
    <Box as="section" className={saitClasses.rulesCard}>
      <button
        type="button"
        onClick={view.toggle}
        aria-expanded={view.open}
        className={cn(saitClasses.rulesHead, "w-full cursor-pointer text-left transition-colors hover:bg-surface-hover")}
      >
        <Icon node={iconScrollText} size="md" tone="secondary" />
        <Text as="span" className={saitClasses.rulesHeadText}>
          <Text as="span" className={saitClasses.rulesTitle} webClassName="block">
            {view.title}
          </Text>
          <Text as="span" className={saitClasses.rulesSubtitle} webClassName="block">
            {view.subtitle}
          </Text>
        </Text>
        {busy ? <Icon node={iconLoader} size="md" tone="secondary" webClassName="animate-spin" /> : null}
        <Box webClassName={cn("transition-transform duration-200", view.open && "rotate-180")}>
          <Icon node={iconChevronDown} size="xl" tone="muted" />
        </Box>
      </button>

      <Box webClassName={cn("grid transition-[grid-template-rows] duration-300 ease-out", view.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <Box webClassName="overflow-hidden">
          <RulesBody view={view} />
        </Box>
      </Box>
    </Box>
  );
}

function RulesBody({ view }: { view: NonNullable<ReturnType<typeof useSaitRules>> }) {
  return (
    <Box className={saitClasses.rulesBody}>
      {view.intro ? (
        <Text as="p" className={saitClasses.rulesIntro} webClassName="m-0">
          {view.intro}
        </Text>
      ) : null}

      {view.hint ? (
        <Text as="p" className={cn(saitClasses.rulesHint, saitClasses.rulesHintText)} webClassName="m-0">
          <Icon node={iconInfo} size="sm" tone="muted" className="mt-0.5" />
          {view.hint}
        </Text>
      ) : null}

      {view.rules.length > 0 ? (
        <Box
          as="ol"
          className={saitClasses.ruleList}
          webClassName="m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {view.rules.map((r) => (
            <Box
              as="li"
              key={r.key}
              className={cn(saitClasses.rule, r.off ? saitClasses.ruleOff : saitClasses.ruleOn)}
              webClassName="h-full transition-colors"
            >
              <Box className={saitClasses.ruleHead}>
                <Text as="span" className={cn(saitClasses.ruleNum, saitClasses.ruleNumText)}>
                  {r.num}
                </Text>
                <Text as="p" className={cn(saitClasses.ruleText, r.off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn)} webClassName="m-0">
                  {r.text}
                </Text>
                {r.toggleable ? <RuleSwitch checked={r.enabled} onChange={r.setEnabled} label={view.switchLabel} /> : null}
              </Box>

              {r.shloka || r.source || r.gloss ? (
                <Box className={cn(saitClasses.ruleDetail, r.off && saitClasses.ruleDetailOff)} webClassName="mt-auto">
                  {r.source ? (
                    <Text as="p" className={saitClasses.ruleSource} webClassName="m-0">
                      {r.source}
                    </Text>
                  ) : null}
                  {r.shloka ? (
                    <Text as="p" className={saitClasses.ruleShloka} webClassName="m-0">
                      {r.shloka}
                    </Text>
                  ) : null}
                  {r.gloss ? (
                    <Text as="p" className={saitClasses.ruleGloss} webClassName="m-0">
                      {r.gloss}
                    </Text>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {view.engine ? (
        <Text as="p" className={cn(saitClasses.engine, saitClasses.engineText)} webClassName="m-0">
          <Icon node={iconInfo} size="sm" tone="muted" />
          {view.engine}
        </Text>
      ) : null}
    </Box>
  );
}
