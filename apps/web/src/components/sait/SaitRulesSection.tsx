import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ChevronDown, Info, Loader2, ScrollText } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { Switch } from "@/components/ui/switch";

export interface SaitRule {
  /** Stable id matching the engine's toggleable rules; when set the rule can be switched off. */
  id?: string;
  /** Catalogue key for the plain-language rule. */
  text: string;
  /** Catalogue key for the short citation. */
  source?: string;
  /** Sanskrit verse (Devanāgarī) the rule derives from — not translated. */
  shloka?: string;
  /** Catalogue key for the translation of `shloka`. */
  gloss?: string;
}

/**
 * Classical method + rules for a ceremony. Collapsed by default so the date
 * list stays primary; opens for readers who want the śāstra rationale.
 * Rules render as a responsive card grid (up to 4 per row on large screens).
 *
 * When `onToggleRule` is supplied, each rule that carries an `id` gets a switch:
 * turning it off asks the engine to recompute the dates without that rule, so a
 * community that keeps only a handpicked subset still gets a matching list.
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
  /** Show a recomputing indicator while a custom-rule fetch is in flight. */
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const intro = method ? bilingualText(lang, method.ne ?? "", method.en ?? "") : "";
  if (!intro && (!rules || rules.length === 0)) return null;

  const ruleCount = rules?.length ?? 0;
  const togglingEnabled = Boolean(onToggleRule);
  const offCount = togglingEnabled
    ? (rules ?? []).filter((r) => r.id && !(enabledRuleIds?.has(r.id) ?? true)).length
    : 0;

  return (
    <section className={saitClasses.rulesCard}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(saitClasses.rulesHead, "w-full text-left transition-colors hover:bg-surface-hover")}
      >
        <ScrollText className="size-4 shrink-0 text-secondary" aria-hidden />
        <span className={saitClasses.rulesHeadText}>
          <span className={cn("block", saitClasses.rulesTitle)}>
            {t("sait.how_this_list_is_generated")}
          </span>
          <span className={cn("block", saitClasses.rulesSubtitle)}>
            {offCount > 0
              ? bilingualText(lang, `${digits(ruleCount)} मध्ये ${digits(offCount)} नियम हटाइएको`, `${digits(offCount)} of ${digits(ruleCount)} rules switched off`)
              : togglingEnabled
                ? bilingualText(lang, `${digits(ruleCount)} शास्त्रीय नियम · आफ्नो परम्परा अनुसार अफ गर्न मिल्ने`, `${digits(ruleCount)} classical rules · switch off any your tradition skips`)
                : bilingualText(lang, `${digits(ruleCount)} शास्त्रीय नियम · स्रोतसहित`, `${digits(ruleCount)} classical rules · with sources`)}
          </span>
        </span>
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-secondary" aria-hidden />
        ) : null}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className={saitClasses.rulesBody}>
            {intro ? (
              <p className={cn("m-0", saitClasses.rulesIntro)}>
                {intro}
              </p>
            ) : null}

            {togglingEnabled ? (
              <p className={cn("m-0", saitClasses.rulesHint, saitClasses.rulesHintText)}>
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t("sait.switch_off_a_rule_your_community_doesn_t_follow_the_dat")}
              </p>
            ) : null}

            {rules && rules.length > 0 ? (
              <ol className={cn("m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", saitClasses.ruleList)}>
                {rules.map((r, i) => {
                  const toggleable = Boolean(r.id && togglingEnabled);
                  const enabled = r.id ? (enabledRuleIds?.has(r.id) ?? true) : true;
                  const off = toggleable && !enabled;
                  return (
                    <li
                      key={r.id ?? i}
                      className={cn(
                        saitClasses.rule,
                        "h-full transition-colors",
                        off ? saitClasses.ruleOff : saitClasses.ruleOn,
                      )}
                    >
                      <div className={saitClasses.ruleHead}>
                        <span className={cn(saitClasses.ruleNum, saitClasses.ruleNumText)}>
                          {digits(i + 1)}
                        </span>
                        <p
                          className={cn(
                            "m-0",
                            saitClasses.ruleText,
                            off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn,
                          )}
                        >
                          {t(r.text)}
                        </p>
                        {toggleable ? (
                          <Switch
                            size="sm"
                            checked={enabled}
                            onCheckedChange={(v) => r.id && onToggleRule?.(r.id, v)}
                            aria-label={t("sait.apply_this_rule")}
                            className="mt-0.5 shrink-0"
                          />
                        ) : null}
                      </div>

                      {r.shloka || r.source || r.gloss ? (
                        <div
                          className={cn(
                            "mt-auto",
                            saitClasses.ruleDetail,
                            off && saitClasses.ruleDetailOff,
                          )}
                        >
                          {r.source ? (
                            <p className={cn("m-0", saitClasses.ruleSource)}>
                              {t(r.source)}
                            </p>
                          ) : null}
                          {r.shloka ? (
                            <p
                              lang="sa"
                              className={cn("m-0", saitClasses.ruleShloka)}
                            >
                              {r.shloka}
                            </p>
                          ) : null}
                          {r.gloss ? (
                            <p className={cn("m-0", saitClasses.ruleGloss)}>
                              {t(r.gloss)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {engineVersion ? (
              <p className={cn("m-0", saitClasses.engine, saitClasses.engineText)}>
                <Info className="size-3.5" aria-hidden />
                {t("sait.muh_rta_engine")} {engineVersion}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SaitRulesSection;
