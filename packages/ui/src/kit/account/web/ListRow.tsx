import { Children, type ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { Icon } from "@vedic-patro/ui";
import type { ListGroupProps, ListRowProps } from "../contract";
import { ACCOUNT_ICONS, ACCOUNT_TINTS, iconChevronRightList } from "../icons";
import { withAlpha } from "@vedic-patro/design-tokens";

/** A titled group of rows on one rounded card, like a section of iOS Settings. */
export function ListGroup({ title, children }: ListGroupProps) {
  const items = Children.toArray(children).filter(Boolean) as ReactNode[];
  return (
    <section className="flex flex-col gap-2">
      {title ? <h2 className={cn("m-0", accountClasses.groupTitle)}>{title}</h2> : null}
      <div className={accountClasses.groupCard}>
        {items.map((child, i) => (
          <div key={i}>
            {i > 0 ? <div className={accountClasses.groupDivider} /> : null}
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

/** One row: a tinted icon, the title (and a line under it), then a value and a chevron or a trailing control. */
export function ListRow({ icon, title, subtitle, value, onPress, trailing, tint = "teal", tone = "default" }: ListRowProps) {
  const danger = tone === "danger";
  const color = ACCOUNT_TINTS[danger ? "red" : tint];
  const body = (
    <>
      <span className={cn("flex", accountClasses.rowIcon)} style={{ backgroundColor: withAlpha(color, 0.16) }}>
        <Icon node={ACCOUNT_ICONS[icon]} size={20} color={color} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className={cn("truncate", accountClasses.rowTitle, danger && "text-destructive")}>{title}</span>
        {subtitle ? <span className={cn("line-clamp-2", accountClasses.rowSubtitle)}>{subtitle}</span> : null}
      </span>
      {value ? <span className={cn("truncate", accountClasses.rowValue)}>{value}</span> : null}
      {trailing ?? (onPress ? <Icon node={iconChevronRightList} size={18} tone="muted" /> : null)}
    </>
  );
  const cls = cn("flex w-full", accountClasses.row);
  if (!onPress) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onPress} className={cn(cls, "cursor-pointer border-none bg-transparent transition-colors hover:bg-muted")}>
      {body}
    </button>
  );
}
