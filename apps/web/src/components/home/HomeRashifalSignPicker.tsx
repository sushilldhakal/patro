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
import { useHomeRashifalSignPicker } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalToneBar, rashifalToneText } from "@/lib/rashifal-ui";
import type { RashifalSignBlock } from "@/lib/api";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  signs: RashifalSignBlock[];
  /** Pre-select (e.g. Sun's sign for the current BS month). */
  defaultSignId?: number;
};

/**
 * Desktop monthly rashifal: left thumbnail grid (3×4) + right card carousel synced to selection.
 */
export function HomeRashifalSignPicker({ signs, defaultSignId }: Props) {
  const picker = useHomeRashifalSignPicker(signs, defaultSignId);
  const { selectIndex, defaultIndex } = picker;
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || defaultIndex == null) return;
    api.scrollTo(defaultIndex, false);
  }, [api, defaultIndex]);

  const syncFromCarousel = useCallback(() => {
    if (!api) return;
    selectIndex(api.selectedScrollSnap());
  }, [api, selectIndex]);

  useEffect(() => {
    if (!api) return;
    // The carousel (embla) only exists once mounted, so its current snap
    // can't be read during render — this call seeds the selection from it
    // once, and the two listeners below keep it synced afterward.
    syncFromCarousel();
    api.on("select", syncFromCarousel).on("reInit", syncFromCarousel);
    return () => {
      api.off("select", syncFromCarousel);
    };
  }, [api, syncFromCarousel]);

  const goToSign = (index: number) => {
    api?.scrollTo(index);
    selectIndex(index);
  };

  if (!signs.length) return null;

  return (
    <div className="grid items-start gap-3 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-4">
      <nav
        className={cn("w-full min-w-0 max-w-[22rem] shrink-0 justify-self-start md:sticky md:top-20", homeClasses.pickerGrid)}
        aria-label={picker.copy.chooseRashi}
      >
        <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {picker.thumbs.map((sign) => {
            const { active } = sign;
            return (
              <li key={sign.id}>
                <button
                  type="button"
                  onClick={() => goToSign(sign.index)}
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
                      name={sign.glyphName}
                      number={sign.id}
                      size={32}
                    />
                  </span>
                  <span className={cn("w-full truncate", homeClasses.pickerName)}>
                    {sign.name}
                  </span>
                  <span className={homeClasses.pickerBarRow}>
                    <span className={homeClasses.pickerBar}>
                      <span
                        className={cn("block", homeClasses.pickerBarFill, rashifalToneBar(sign.tone))}
                        style={{ width: `${sign.percent}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        homeClasses.pickerPercent,
                        "text-diagram-xs tabular-nums",
                        rashifalToneText(sign.tone),
                      )}
                    >
                      {sign.percentLabel}
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
