import { Clock } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { useRashifalPersonalCard } from "@vedic-patro/features/rashifal";
import type { RashifalPersonal } from "@/lib/api";
import { RashifalComponents, RashifalDomains, RashifalLucky, RashifalMeter, RashifalWhyButton } from "@/components/rashifal/RashifalCardParts";

type Props = {
  name: string;
  personal: RashifalPersonal;
};

/**
 * A single personal rashifal — cast on the profile's own birth chart (Lagna,
 * natal Ashtakavarga, running Vimshottari dasha) rather than the general
 * engine's twelve-sign Moon-sign sweep. Mirrors {@link RashifalSignCard}'s
 * layout so switching between "all signs" and "my reading" doesn't jar.
 */
export function RashifalPersonalCard({ name, personal }: Props) {
  const card = useRashifalPersonalCard({ personal });
  const detailsId = "rashifal-personal-detail";

  return (
    <article className={cn(rashifalClasses.cardPersonal, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_18%,transparent)]")}>
      <header className={rashifalClasses.header}>
        <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={36} className="shrink-0" />
        <div className={rashifalClasses.headerBody}>
          <h3 className={rashifalClasses.name}>{name}</h3>
          <p className={rashifalClasses.nameSub}>{card.sub}</p>
        </div>
      </header>

      <RashifalMeter card={card} />

      {/* Running dasha — the layer only a birth chart can give. */}
      {card.dashaLine ? (
        <div className={rashifalClasses.dashaRow}>
          <Clock className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
          <span className={cn("truncate", rashifalClasses.dashaText)}>{card.dashaLine}</span>
        </div>
      ) : null}

      <RashifalDomains card={card} />
      <p className={cn("m-0 flex-1", rashifalClasses.prediction)}>{card.prediction}</p>
      <RashifalLucky card={card} className="grid-cols-2 sm:grid-cols-3" />
      <RashifalWhyButton card={card} detailsId={detailsId} />

      {card.open ? (
        <div id={detailsId} className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? <p className={rashifalClasses.lordLine}>{card.lordLine}</p> : null}
          {card.dashaRange ? <p className={rashifalClasses.footNote}>{card.dashaRange}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
