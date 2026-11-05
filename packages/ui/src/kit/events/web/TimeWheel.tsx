import { useEffect, useRef } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import type { TimeWheelProps } from "../contract";
import { wheelColumns, type WheelColumn } from "../wheel-items";

/** One row of the wheel, and how many show (the chosen one in the middle band). */
const ROW = 32;
const VISIBLE = 5;

/** Apple's time wheel under a time row: each column scrolls and snaps; a click on an entry picks it too. */
export function TimeWheel({ value, onChange }: TimeWheelProps) {
  const { lang, digits } = useLocale();
  return (
    <div className="relative flex py-1" style={{ height: ROW * VISIBLE + 8 }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 rounded-lg bg-background/80" style={{ top: 4 + ROW * 2, height: ROW }} />
      {wheelColumns(value, onChange, lang === "en", (s) => digits(s)).map((col) => (
        <Column key={col.id} col={col} />
      ))}
    </div>
  );
}

function Column({ col }: { col: WheelColumn }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);
  const index = Math.max(0, col.items.findIndex((i) => i.value === col.value));

  // Keep the chosen entry in the band when the value changes from outside (a pick, the other columns).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTo({ top: index * ROW });
  }, [index]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={col.id}
      onScroll={() => {
        if (settle.current) clearTimeout(settle.current);
        settle.current = setTimeout(() => {
          const el = ref.current;
          if (!el) return;
          const i = Math.min(col.items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
          if (i !== index) col.pick(col.items[i]!.value);
        }, 120) as unknown as number;
      }}
      className="relative flex-1 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingBlock: ROW * 2 }}
    >
      {col.items.map((item, i) => (
        <button
          key={item.value}
          type="button"
          role="option"
          aria-selected={i === index}
          onClick={() => col.pick(item.value)}
          className={cn("block w-full snap-center text-center tabular-nums", i === index ? "text-xl text-foreground" : "text-base text-muted-foreground")}
          style={{ height: ROW, lineHeight: `${ROW}px` }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
