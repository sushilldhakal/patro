import { cn } from "@/lib/utils";

/** Patro-style upright vertical text along a cell edge (md+ layouts). */
export function VerticalEdgeLabel({
  text,
  side,
  className,
  insetClass = "inset-y-1",
}: {
  text: string;
  side: "left" | "right";
  className?: string;
  /** Tailwind inset override, e.g. `inset-y-2` for taller header/footer cells. */
  insetClass?: string;
}) {
  // Spaces in vertical-rl create extra columns; keep one vertical run.
  const label = text.replace(/\s+/g, "\u2009");
  const fontSize = label.length > 20 ? 8 : label.length > 16 ? 9 : label.length > 12 ? 10 : 11;

  const textEl = (
    <span
      className={cn(
        "inline-block max-h-full whitespace-nowrap font-semibold leading-[1.4] tracking-wide",
        "[writing-mode:vertical-rl] [text-orientation:mixed] font-num",
        className,
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      {label}
    </span>
  );

  return (
    <span
      className={cn(
        "pointer-events-none absolute z-[2] max-md:hidden",
        "flex w-[1.375rem] items-center justify-center overflow-visible",
        insetClass,
        side === "left" ? "left-0.5" : "right-0.5",
      )}
      aria-hidden
    >
      {side === "left" ? (
        <span className="flex h-full w-full rotate-180 items-center justify-center overflow-hidden px-px py-0.5">
          {textEl}
        </span>
      ) : (
        <span className="flex h-full w-full items-center justify-center overflow-hidden px-px py-0.5">
          {textEl}
        </span>
      )}
    </span>
  );
}
