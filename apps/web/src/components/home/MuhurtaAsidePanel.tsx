import { Info } from "lucide-react";
import type { PanchangaDay } from "@/lib/api";
import { useMuhurtaAside } from "@vedic-patro/features/home";
import { patroNavataraRow } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  p: PanchangaDay;
  dateAd: string;
};

export function MuhurtaAsidePanel({ p }: Props) {
  const aside = useMuhurtaAside(p);
  const { panel } = aside;

  return (
    <div className={homeClasses.muhurtaStack}>
      <div className="grid grid-cols-5 gap-1" role="tablist" aria-label={aside.tabsLabel}>
        {aside.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={cn(
              "cursor-pointer transition-colors",
              homeClasses.muhurtaSubTab,
              homeClasses.muhurtaSubTabLabel,
              tab.active
                ? cn(homeClasses.muhurtaSubTabActive, homeClasses.muhurtaSubTabLabelActive)
                : cn(homeClasses.muhurtaSubTabIdle, "hover:bg-tab-hover hover:text-foreground"),
            )}
            aria-selected={tab.active}
            onClick={tab.select}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className={cn("m-0", homeClasses.muhurtaHint, homeClasses.muhurtaHintText)}>
        <Info size={13} strokeWidth={2} className={homeClasses.muhurtaHintIcon} aria-hidden />
        <span>{aside.hint}</span>
      </p>

      <div role="tabpanel">
        {panel.empty ? (
          <p className={cn("m-0", homeClasses.muhurtaEmpty)}>{panel.empty}</p>
        ) : (
          <div>
            {panel.moonRef ? (
              <p className={cn("m-0", homeClasses.muhurtaMoonRef)}>
                {panel.moonRef.label} <strong className={homeClasses.muhurtaMoonRefStrong}>{panel.moonRef.value}</strong>
              </p>
            ) : null}
            <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
              {panel.slots.map((slot) => (
                <li key={slot.key} className={patroNavataraRow(slot.tone, slot.isMoon)}>
                  <span className={homeClasses.muhurtaSlotTitle}>{slot.title}</span>
                  <span className={homeClasses.muhurtaSlotValue}>
                    {slot.value}
                    <span className={cn("mx-1", homeClasses.muhurtaSlotSep)}>/</span>
                    {slot.quality}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
