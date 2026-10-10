/**
 * A still picture a chapter holds up beside the scene, and the one-line tip.
 *
 * The reference lab does this with a cartoon television its narrator switches
 * on to show a photograph — an equation-of-time plot, a stacked analemma. The
 * reason it exists is real: a simulation shows you where things *are*, and some
 * beats want a picture of the actual sky, or of the figure the तारा make that
 * the model has no way to draw. This app already ships that artwork — the
 * राशि and नक्षत्र plates in `public/illustrations` — so the slot is worth
 * having even without the television around it.
 *
 * Missing files draw nothing rather than an alt-text box. A chapter can
 * therefore name a picture that has not been made yet, exactly the way it can
 * name a voiceover that has not been recorded.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Mount this with `key={src}`.
 *
 * The "did it load" flag has to start false again for each new picture, and a
 * fresh mount is how that is said without an effect that resets state on a
 * prop change — one missing file would otherwise suppress every still after it.
 */
export function ChapterStill({
  src,
  captionKey,
  onClose,
}: {
  /** Path under `public/`, no leading slash. */
  src: string;
  captionKey?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);

  if (!src || broken) return null;
  return (
    <figure
      className={cn(
        /* Clear of the corner readout above it, which a chapter can have on
           at the same time. */
        "absolute left-3 top-[5.25rem] z-10 m-0 w-[min(240px,45%)] overflow-hidden rounded-xl",
        "border border-white/20 bg-black/80 backdrop-blur",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute right-1 top-1 z-10 grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white/70 hover:text-white"
      >
        <X size={12} />
      </button>
      <img
        src={`${import.meta.env.BASE_URL}${src}`}
        alt={captionKey ? t(captionKey) : ""}
        onError={() => setBroken(true)}
        className="block w-full object-contain"
      />
      {captionKey ? (
        <figcaption className="px-2 py-1.5 text-[11px] leading-snug text-white/70">
          {t(captionKey)}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The chapter's own hint, over the top of the scene. Mount with `key={tipKey}`.
 *
 * It retires itself after a few seconds rather than waiting for the next
 * keyframe to clear it: a tip is an aside, and one that sits there for the rest
 * of a chapter reads as a warning instead. The key is what re-arms the timer
 * for the next hint.
 */
export function ChapterTip({ tipKey }: { tipKey: string }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), 6000);
    return () => clearTimeout(id);
  }, []);

  if (!tipKey || done) return null;
  return (
    <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
      {t(tipKey)}
    </div>
  );
}
