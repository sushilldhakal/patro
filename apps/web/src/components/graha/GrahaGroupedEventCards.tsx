import type { ReactNode } from "react";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

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
  bodyClassName,
}: GrahaGroupedEventCardsProps<T>) {
  return (
    <div className={cn(grahaClasses.columns, "columns-1 gap-3 sm:columns-2 lg:columns-3")}>
      {order.map((key) => {
        const items = groups.get(key) ?? [];
        return (
          <div
            key={key}
            className={cn(patroCard, grahaClasses.columnCard, "flex break-inside-avoid flex-col")}
          >
            <div className={cn(grahaClasses.columnHead, "flex")}>
              {renderCardHeader(key, items)}
            </div>
            <div className={cn(grahaClasses.columnBody, "flex flex-col", bodyClassName)}>
              {items.length ? items.map((item, i) => renderItem(item, i)) : emptyInGroup}
            </div>
          </div>
        );
      })}
    </div>
  );
}
