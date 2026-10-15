/**
 * The chandrabala / tarabala card grid, shared by the website's and the app's
 * `components/panchanga/NavataraBalamCardGrid.tsx`: one card per rashi or
 * nakshatra with its name, time range, "tara/quality" subtitle, tone and
 * whether it holds the clock; each app draws the glyph and the card.
 */
import { findCurrentBalamCard, type BalamCardItem } from "@vedic-patro/domain/balam-cards";
import { formatNavataraQuality, formatNavataraTara } from "@vedic-patro/domain/navatara-bala";

export function useNavataraBalamCards({
  cards,
  clock,
  formatName,
  lang,
}: {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
}) {
  const current = findCurrentBalamCard(cards, clock);
  return cards.map((card) => ({
    key: card.key,
    /** Glyph id (the Nepali rashi / nakshatra name) and its number. */
    glyph: { name: card.name, number: card.number },
    name: formatName(card),
    timeRange: card.timeRange ?? null,
    subtitle: `${formatNavataraTara(card.tara, lang)}/${formatNavataraQuality(card.quality, lang)}`,
    tone: card.tone,
    isCurrent: current?.key === card.key,
  }));
}
