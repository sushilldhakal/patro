import { Icon } from "@vedic-patro/ui";
import { kitIcons } from "@vedic-patro/ui/classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useChapterStill, useChapterTip } from "@vedic-patro/features/learn";
import type { ChapterStillProps, ChapterTipProps } from "../contract";

/** Mount with `key={src}` so a failed picture does not hide the next one. */
export function ChapterStill({ src, captionKey, onClose }: ChapterStillProps) {
  const still = useChapterStill(src, captionKey);
  if (!still.visible) return null;
  const base = import.meta.env.BASE_URL ?? "/";
  return (
    <figure
      className={cn(
        "absolute left-3 top-[5.25rem] z-10 m-0 w-[min(240px,45%)] overflow-hidden rounded-xl",
        "border border-white/20 bg-black/80 backdrop-blur",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={still.closeLabel}
        className="absolute right-1 top-1 z-10 grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white/70 hover:text-white"
      >
        <Icon node={kitIcons.x} size={12} tone="foreground" className="text-white" />
      </button>
      <img src={`${base}${src}`} alt={still.caption} onError={still.onError} className="block w-full object-contain" />
      {still.caption ? <figcaption className="px-2 py-1.5 text-xs leading-snug text-white/70">{still.caption}</figcaption> : null}
    </figure>
  );
}

/** Mount with `key={tipKey}`. The tip retires itself; the key arms the next one. */
export function ChapterTip({ tipKey }: ChapterTipProps) {
  const tip = useChapterTip(tipKey);
  if (!tip) return null;
  return (
    <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
      {tip}
    </div>
  );
}
