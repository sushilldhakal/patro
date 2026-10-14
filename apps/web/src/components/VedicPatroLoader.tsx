import { cn } from "@vedic-patro/domain/utils";
import { useVedicPatroLoader } from "@vedic-patro/features/common";

/** Reference app-icon size from vedicpatro brand sheet */
export const PAGE_LOADER_SIZE = 120;

export function VedicPatroLoader({
  label,
  size = PAGE_LOADER_SIZE,
  className,
}: {
  /** Omit for the localized default; pass null to hide the caption. */
  label?: string | null;
  size?: number;
  className?: string;
}) {
  const shown = useVedicPatroLoader(label);
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <img
        src="/loader.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[22%] shadow-md"
        aria-hidden
      />
      {shown ? <p className="text-sm">{shown}</p> : null}
    </div>
  );
}
