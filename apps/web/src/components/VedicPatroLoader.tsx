import { VedicPatroLoader as VedicPatroLoaderView } from "@vedic-patro/ui/kit/shell";

/** Reference app-icon size from vedicpatro brand sheet */
export const PAGE_LOADER_SIZE = 120;

/** Page loader. The caption column is shared; the mark is the website's loader image. */
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
  return (
    <VedicPatroLoaderView
      label={label}
      className={className}
      mark={<img src="/loader.svg" alt="" width={size} height={size} className="shrink-0 rounded-[22%] shadow-md" aria-hidden />}
    />
  );
}
