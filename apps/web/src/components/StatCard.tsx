import { cn } from "../lib/utils";

interface Props {
  label: string;
  value?: string | null;
  sub?: string;
  className?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, sub, className, highlight }: Props) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 flex flex-col gap-1",
        highlight && "border-secondary/40 bg-secondary/5",
        className
      )}
    >
      <span className="text-sm font-semibold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-base font-semibold text-foreground leading-snug">
        {value ?? <span>—</span>}
      </span>
      {sub && <span className="text-xs">{sub}</span>}
    </div>
  );
}
