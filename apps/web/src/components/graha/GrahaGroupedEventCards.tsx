import type { ReactNode } from "react";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@/lib/utils";

type GrahaGroupedEventCardsProps<T> = {
  order: readonly string[];
  groups: Map<string, T[]>;
  renderCardHeader: (key: string, items: T[]) => ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  emptyInGroup: ReactNode;
  bodyClassName?: string;
};

export function GrahaGroupedEventCards<T>({
  order,
  groups,
  renderCardHeader,
  renderItem,
  emptyInGroup,
  bodyClassName = "flex flex-col gap-2 p-2",
}: GrahaGroupedEventCardsProps<T>) {
  return (
    <div className="mt-2 columns-1 gap-3 sm:columns-2 lg:columns-3">
      {order.map((key) => {
        const items = groups.get(key) ?? [];
        return (
          <div
            key={key}
            className={cn(patroCard, "mb-3 flex break-inside-avoid flex-col")}
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-border bg-secondary/[0.09] px-3 py-2 dark:bg-secondary/20">
              {renderCardHeader(key, items)}
            </div>
            <div className={bodyClassName}>
              {items.length ? items.map((item, i) => renderItem(item, i)) : emptyInGroup}
            </div>
          </div>
        );
      })}
    </div>
  );
}
