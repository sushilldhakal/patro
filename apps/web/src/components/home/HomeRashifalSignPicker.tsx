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
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalToneBar, rashifalToneText, toNepaliDigits } from "@/lib/rashifal-ui";
import type { RashifalSignBlock } from "@/lib/api";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
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
        className={cn("w-full min-w-0 max-w-[22rem] shrink-0 justify-self-start md:sticky md:top-20", homeClasses.pickerGrid)}
        aria-label={tFor(lang, "ui.home.choose_rashi")}
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
                    "flex w-full flex-col text-left transition-colors",
                    homeClasses.pickerThumb,
                    active
                      ? cn(homeClasses.pickerThumbActive, "text-foreground ring-1 ring-secondary/25")
                      : cn(homeClasses.pickerThumbIdle, "text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"),
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
                  <span className={cn("w-full truncate", homeClasses.pickerName)}>
                    {name}
                  </span>
                  <span className={homeClasses.pickerBarRow}>
                    <span className={homeClasses.pickerBar}>
                      <span
                        className={cn("block", homeClasses.pickerBarFill, rashifalToneBar(sign.tone))}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        homeClasses.pickerPercent,
                        "text-diagram-xs tabular-nums",
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
          className={cn(homeClasses.pickerCarousel, "md:px-10")}
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {signs.map((sign) => (
              <CarouselItem
                key={sign.id}
                className="basis-full pl-3 md:pl-4 xl:basis-1/2"
              >
                <RashifalSignCard sign={sign} period="monthly" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className={cn("left-0 disabled:opacity-30", homeClasses.pickerArrow)} />
          <CarouselNext className={cn("right-0 disabled:opacity-30", homeClasses.pickerArrow)} />
        </Carousel>
      </div>
    </div>
  );
}
