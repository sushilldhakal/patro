import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { useRashifalSignCard } from "@vedic-patro/features/rashifal";
import type { RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { RashifalComponents, RashifalDomains, RashifalLucky, RashifalMeter, RashifalWhyButton } from "@/components/rashifal/RashifalCardParts";

type Props = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
  taraLine?: string;
};

export function RashifalSignCard({ sign, period, taraLine }: Props) {
  const card = useRashifalSignCard({ sign, period });
  const detailsId = `rashifal-detail-${sign.id}`;

  return (
    <article className={cn(rashifalClasses.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
      <header className={rashifalClasses.header}>
        <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={36} className="shrink-0" />
        <div className={rashifalClasses.headerBody}>
          <h3 className={rashifalClasses.name}>{card.name}</h3>
          <p className={rashifalClasses.nameSub}>{card.sub}</p>
        </div>
        {taraLine && card.tone ? <span className={cn(rashifalClasses.taraBadge, patroNavataraToneBg(card.tone))}>{taraLine}</span> : null}
      </header>

      <RashifalMeter card={card} />
      {card.grade ? <p className={rashifalClasses.grade}>{card.grade}</p> : null}
      <RashifalDomains card={card} />
      <p className={cn("m-0 flex-1", rashifalClasses.prediction)}>{card.prediction}</p>
      {/* Lucky row — colour, number, direction and (daily only) the sign lord's hora. */}
      <RashifalLucky card={card} className="grid-cols-2" />
      <RashifalWhyButton card={card} detailsId={detailsId} />

      {card.open ? (
        <div id={detailsId} className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? <p className={rashifalClasses.lordLine}>{card.lordLine}</p> : null}
          {card.windowDays ? <p className={rashifalClasses.footNote}>{card.windowDays}</p> : null}
          {card.remedy ? <p className={rashifalClasses.remedy}>{card.remedy}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
