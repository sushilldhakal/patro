import type { BalamCardItem } from "@/lib/balam-cards";
import { findCurrentBalamCard } from "@/lib/balam-cards";
import { formatNavataraQuality, formatNavataraTara } from "@/lib/navatara-bala";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { PanchangaBalamCard, panchangaCardGrid } from "./PanchangaLayout";

export function NavataraBalamCardGrid({
  cards,
  clock,
  formatName,
  lang,
  variant = "chandrabala",
}: {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant?: "chandrabala" | "tarabala";
}) {
  const current = findCurrentBalamCard(cards, clock);
  if (!cards.length) return null;

  return (
    <div className={panchangaCardGrid}>
      {cards.map((card) => {
        const subtitle = `${formatNavataraTara(card.tara, lang)}/${formatNavataraQuality(card.quality, lang)}`;
        const name = formatName(card);
        const titleLine = (
          <>
            {name}
            {card.timeRange ? (
              <>
                {" "}
                <span className="font-mono font-semibold tabular-nums">{card.timeRange}</span>
              </>
            ) : null}
          </>
        );
        return (
          <PanchangaBalamCard
            key={card.key}
            titleLine={titleLine}
            subtitleLine={subtitle}
            tone={card.tone}
            isCurrent={current?.key === card.key}
            icon={
              variant === "tarabala" ? (
                <NakshatraGlyphIcon name={card.name} number={card.number} size={24} />
              ) : (
                <RashiGlyphIcon name={card.name} number={card.number} size={24} />
              )
            }
          />
        );
      })}
    </div>
  );
}
