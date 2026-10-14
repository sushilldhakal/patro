import { ChevronDown, Info, Loader2, ScrollText } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { useSaitRules } from "@vedic-patro/features/sait";
import { Switch } from "@/components/ui/switch";

export type SaitRule = SaitRuleEntry;

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
  busy = false,
  ...props
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
  const view = useSaitRules(props);
  if (!view) return null;

  return (
    <section className={saitClasses.rulesCard}>
      <button
        type="button"
        onClick={view.toggle}
        aria-expanded={view.open}
        className={cn(saitClasses.rulesHead, "w-full text-left transition-colors hover:bg-surface-hover")}
      >
        <ScrollText className="size-4 shrink-0 text-secondary" aria-hidden />
        <span className={saitClasses.rulesHeadText}>
          <span className={cn("block", saitClasses.rulesTitle)}>{view.title}</span>
          <span className={cn("block", saitClasses.rulesSubtitle)}>{view.subtitle}</span>
        </span>
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-secondary" aria-hidden /> : null}
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", view.open && "rotate-180")}
          aria-hidden
        />
      </button>

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", view.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className={saitClasses.rulesBody}>
            {view.intro ? <p className={cn("m-0", saitClasses.rulesIntro)}>{view.intro}</p> : null}

            {view.hint ? (
              <p className={cn("m-0", saitClasses.rulesHint, saitClasses.rulesHintText)}>
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {view.hint}
              </p>
            ) : null}

            {view.rules.length > 0 ? (
              <ol className={cn("m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", saitClasses.ruleList)}>
                {view.rules.map((r) => (
                  <li key={r.key} className={cn(saitClasses.rule, "h-full transition-colors", r.off ? saitClasses.ruleOff : saitClasses.ruleOn)}>
                    <div className={saitClasses.ruleHead}>
                      <span className={cn(saitClasses.ruleNum, saitClasses.ruleNumText)}>{r.num}</span>
                      <p className={cn("m-0", saitClasses.ruleText, r.off ? saitClasses.ruleTextOff : saitClasses.ruleTextOn)}>{r.text}</p>
                      {r.toggleable ? (
                        <Switch
                          size="sm"
                          checked={r.enabled}
                          onCheckedChange={r.setEnabled}
                          aria-label={view.switchLabel}
                          className="mt-0.5 shrink-0"
                        />
                      ) : null}
                    </div>

                    {r.shloka || r.source || r.gloss ? (
                      <div className={cn("mt-auto", saitClasses.ruleDetail, r.off && saitClasses.ruleDetailOff)}>
                        {r.source ? <p className={cn("m-0", saitClasses.ruleSource)}>{r.source}</p> : null}
                        {r.shloka ? (
                          <p lang="sa" className={cn("m-0", saitClasses.ruleShloka)}>
                            {r.shloka}
                          </p>
                        ) : null}
                        {r.gloss ? <p className={cn("m-0", saitClasses.ruleGloss)}>{r.gloss}</p> : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {view.engine ? (
              <p className={cn("m-0", saitClasses.engine, saitClasses.engineText)}>
                <Info className="size-3.5" aria-hidden />
                {view.engine}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SaitRulesSection;
