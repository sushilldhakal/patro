import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { dainikKrantiClasses as c } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

/** The website table primitive's classes, drawn here so the kit does not import the app. */
export function HtmlTable({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={c.htmlTableWrap}>
      <table className={cn(c.htmlTable, className)}>{children}</table>
    </div>
  );
}

export function HtmlHead({ children }: { children: ReactNode }) {
  return <thead className={c.htmlHead}>{children}</thead>;
}

export function HtmlBody({ children }: { children: ReactNode }) {
  return <tbody className={c.htmlBody}>{children}</tbody>;
}

export function HtmlRow({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={cn(c.htmlRow, className)}>{children}</tr>;
}

export function HtmlTh({ className, colSpan, children }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th colSpan={colSpan} className={cn(c.htmlTh, className)}>
      {children}
    </th>
  );
}

export function HtmlTd({ className, colSpan, children }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td colSpan={colSpan} className={cn(c.htmlTd, className)}>
      {children}
    </td>
  );
}
