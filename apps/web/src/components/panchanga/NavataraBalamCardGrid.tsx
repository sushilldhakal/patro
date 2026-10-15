import type { BalamCardItem } from "@vedic-patro/domain/balam-cards";
import { useNavataraBalamCards } from "@vedic-patro/features/panchanga";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { panchangaCardGrid } from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { PanchangaBalamCard } from "./PanchangaLayout";

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
  const items = useNavataraBalamCards({ cards, clock, formatName, lang });
  if (!items.length) return null;

  return (
    <div className={panchangaCardGrid}>
      {items.map((card) => (
        <PanchangaBalamCard
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
