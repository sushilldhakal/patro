import type { ReactNode } from "react";
import type { BalamCardItem } from "@vedic-patro/domain/balam-cards";
import { cn } from "@vedic-patro/domain/utils";
import { useNavataraBalamCards } from "@vedic-patro/features/panchanga";
import {
  panchangaCardBase,
  panchangaCardGrid,
  panchangaCardSubtitle,
  panchangaCardTitle,
} from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "./ElementGlyphIcon";

export type NavataraBalamCardGridProps = {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant?: "chandrabala" | "tarabala";
};

function BalamCard({
  titleLine,
  subtitleLine,
  tone = "neutral",
  isCurrent,
  icon,
}: {
  titleLine: ReactNode;
  subtitleLine?: ReactNode;
  tone?: "best" | "good" | "neutral" | "bad" | "worst";
  isCurrent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.balamCard,
        patroNavataraToneBg(tone),
        isCurrent && "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
      )}
    >
      <span className={cn("flex items-start gap-2", panchangaCardTitle)}>
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{titleLine}</span>
      </span>
      {subtitleLine ? <span className={panchangaCardSubtitle}>{subtitleLine}</span> : null}
    </div>
  );
}

export function NavataraBalamCardGrid({ cards, clock, formatName, lang, variant = "chandrabala" }: NavataraBalamCardGridProps) {
  const items = useNavataraBalamCards({ cards, clock, formatName, lang });
  if (!items.length) return null;
  return (
    <div className={panchangaCardGrid}>
      {items.map((card) => (
        <BalamCard
          key={card.key}
          titleLine={
            <>
              {card.name}
              {card.timeRange ? (
                <>
                  {" "}
                  <span className={panchangaPageClasses.sections.monoTabular}>{card.timeRange}</span>
                </>
              ) : null}
            </>
          }
          subtitleLine={card.subtitle}
          tone={card.tone}
          isCurrent={card.isCurrent}
          icon={
            variant === "tarabala" ? (
              <NakshatraGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            ) : (
              <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            )
          }
        />
      ))}
    </div>
  );
}
