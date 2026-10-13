import { useTranslation } from "@vedic-patro/i18n/react";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export function KundaliSubTabs<T extends string>({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: { id: T; labelKey: string }[];
  activeId: T;
  onSelect: (id: T) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={kundaliDetailClasses.subTabs.root}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            kundaliDetailClasses.subTabs.tab,
            kundaliDetailClasses.subTabs.tabText,
            "transition-colors",
            activeId === item.id
              ? cn(kundaliDetailClasses.subTabs.tabActive, kundaliDetailClasses.subTabs.tabActiveText, "shadow-sm ring-1 ring-border/60")
              : "hover:text-foreground",
          )}
        >
          {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
}
