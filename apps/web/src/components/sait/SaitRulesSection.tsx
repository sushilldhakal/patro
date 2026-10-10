import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ChevronDown, Info, Loader2, ScrollText } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";
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
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
      >
        <ScrollText className="size-4 shrink-0 text-secondary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-foreground">
            {t("sait.how_this_list_is_generated")}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
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
          <div className="space-y-4 border-t border-border px-4 py-4">
            {intro ? (
              <p className="m-0 max-w-4xl text-sm leading-relaxed text-foreground/90">
                {intro}
              </p>
            ) : null}

            {togglingEnabled ? (
              <p className="m-0 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t("sait.switch_off_a_rule_your_community_doesn_t_follow_the_dat")}
              </p>
            ) : null}

            {rules && rules.length > 0 ? (
              <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rules.map((r, i) => {
                  const toggleable = Boolean(r.id && togglingEnabled);
                  const enabled = r.id ? (enabledRuleIds?.has(r.id) ?? true) : true;
                  const off = toggleable && !enabled;
                  return (
                    <li
                      key={r.id ?? i}
                      className={cn(
                        "flex h-full flex-col gap-2 rounded-lg border p-3.5 transition-colors",
                        off
                          ? "border-dashed border-border bg-surface-inset/40"
                          : "border-border bg-surface-inset",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-num flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-xs font-bold text-secondary">
                          {digits(i + 1)}
                        </span>
                        <p
                          className={cn(
                            "m-0 flex-1 text-sm font-semibold leading-snug",
                            off ? "text-muted-foreground" : "text-foreground",
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
                            "mt-auto flex flex-col gap-1.5 border-t border-border pt-2.5",
                            off && "opacity-60",
                          )}
                        >
                          {r.source ? (
                            <p className="m-0 text-sm font-semibold text-muted-foreground">
                              {t(r.source)}
                            </p>
                          ) : null}
                          {r.shloka ? (
                            <p
                              lang="sa"
                              className="m-0 text-base italic leading-relaxed text-foreground"
                            >
                              {r.shloka}
                            </p>
                          ) : null}
                          {r.gloss ? (
                            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
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
              <p className="m-0 flex items-center gap-1.5 text-xs pt-4 text-muted-foreground">
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
