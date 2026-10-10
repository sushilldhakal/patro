import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
      className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1"
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
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            activeId === item.id
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
              : "hover:text-foreground",
          )}
        >
          {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
}
