import { useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { getRashiName } from "@/lib/rashi-i18n";
import { useLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { rashifalToneBar, rashifalToneText, toNepaliDigits } from "@/lib/rashifal-ui";
import type { RashifalSignBlock } from "@/lib/api";

type Props = {
  signs: RashifalSignBlock[];
  /** Pre-select (e.g. Sun's sign for the current BS month). */
  defaultSignId?: number;
};

/**
 * Desktop monthly rashifal: left thumbnail grid (3×4) + right card carousel synced to selection.
 */
export function HomeRashifalSignPicker({ signs, defaultSignId }: Props) {
  const { lang } = useLocale();
  const [selectedId, setSelectedId] = useState(defaultSignId ?? signs[0]?.id ?? 1);
  const [api, setApi] = useState<CarouselApi>();

  // Reset the selection when `defaultSignId` itself changes (a new month's
  // preselected sign) — adjusted during render, per React's guidance for
  // state that mirrors a prop, rather than via an effect that would commit
  // the old selection for one frame first.
  const [prevDefaultSignId, setPrevDefaultSignId] = useState(defaultSignId);
  if (defaultSignId !== prevDefaultSignId) {
    setPrevDefaultSignId(defaultSignId);
    if (defaultSignId != null) setSelectedId(defaultSignId);
  }

  const indexForId = useCallback(
    (id: number) => {
      const i = signs.findIndex((s) => s.id === id);
      return i >= 0 ? i : 0;
    },
    [signs],
  );

  useEffect(() => {
    if (!api || defaultSignId == null) return;
    const idx = indexForId(defaultSignId);
    api.scrollTo(idx, false);
  }, [api, defaultSignId, indexForId]);

  const syncFromCarousel = useCallback(() => {
    if (!api) return;
    const idx = api.selectedScrollSnap();
    const sign = signs[idx];
    if (sign) setSelectedId(sign.id);
  }, [api, signs]);

  useEffect(() => {
    if (!api) return;
    // The carousel (embla) only exists once mounted, so its current snap
    // can't be read during render — this call seeds `selectedId` from it
    // once, and the two listeners below keep it synced afterward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncFromCarousel();
    api.on("select", syncFromCarousel).on("reInit", syncFromCarousel);
    return () => {
      api.off("select", syncFromCarousel);
    };
  }, [api, syncFromCarousel]);

  const goToSign = useCallback(
    (index: number) => {
      api?.scrollTo(index);
      const sign = signs[index];
      if (sign) setSelectedId(sign.id);
    },
    [api, signs],
  );

  if (!signs.length) return null;

  return (
    <div className="grid items-start gap-3 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-4">
      <nav
        className="w-full min-w-0 max-w-[22rem] shrink-0 justify-self-start rounded-xl border border-border bg-card/80 p-2.5 shadow-sm md:sticky md:top-20"
        aria-label={lang === "ne" ? "राशि छान्नुहोस्" : "Choose rashi"}
      >
        <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {signs.map((sign, index) => {
            const name = lang === "ne" ? sign.name : sign.title_en;
            const active = sign.id === selectedId;
            const pct = sign.percent ?? 50;
            return (
              <li key={sign.id}>
                <button
                  type="button"
                  onClick={() => goToSign(index)}
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-1.5 rounded-lg border px-2 py-2.5 text-left transition-colors",
                    active
                      ? "border-secondary bg-secondary/15 text-foreground ring-1 ring-secondary/25"
                      : "border-border/50 bg-muted/25 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="flex items-center justify-center">
                    <RashiGlyphIcon
                      name={getRashiName(sign.id, lang)}
                      number={sign.id}
                      size={32}
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs font-semibold leading-tight">
                    {name}
                  </span>
                  <span className="flex items-center gap-0.5 px-0.5">
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full rounded-full", rashifalToneBar(sign.tone))}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-num text-[0.65rem] font-bold tabular-nums leading-none",
                        rashifalToneText(sign.tone),
                      )}
                    >
                      {toNepaliDigits(pct, lang)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="relative px-9 md:px-10"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {signs.map((sign) => (
              <CarouselItem
                key={sign.id}
                className="basis-full pl-3 md:pl-4 xl:basis-1/2"
              >
                <RashifalSignCard sign={sign} period="monthly" tone={sign.tone} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 size-8 border-border bg-card shadow-sm disabled:opacity-30" />
          <CarouselNext className="right-0 size-8 border-border bg-card shadow-sm disabled:opacity-30" />
        </Carousel>
      </div>
    </div>
  );
}
