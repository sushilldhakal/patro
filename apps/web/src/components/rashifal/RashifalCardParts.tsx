import { ChevronDown } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { NavataraTone } from "@/lib/api";
import type { useRashifalSignCard } from "@vedic-patro/features/rashifal";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { RASHIFAL_DOMAIN_ICON, RASHIFAL_LUCKY_ICON, rashifalToneBar, rashifalToneText } from "@/lib/rashifal-ui";

type Card = Pick<
  ReturnType<typeof useRashifalSignCard>,
  "open" | "toggle" | "stars" | "tone" | "percent" | "percentLabel" | "domains" | "whyLabel" | "components" | "gochar" | "lucky"
>;

/** Five-star strength read straight from the server's tone band. */
function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <span className={cn("inline-flex", rashifalClasses.stars)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)} />
      ))}
    </span>
  );
}

/** Overall strength — the one number that summarises every server layer. */
export function RashifalMeter({ card }: { card: Card }) {
  return (
    <div className={rashifalClasses.meter}>
      <StarMeter stars={card.stars} tone={card.tone} />
      <div className={rashifalClasses.meterTrack}>
        <div className={cn(rashifalClasses.meterFill, "transition-[width]", rashifalToneBar(card.tone))} style={{ width: `${card.percent}%` }} />
      </div>
      <span className={cn(rashifalClasses.percent, rashifalToneText(card.tone))}>
        {card.percentLabel}
        <span aria-hidden="true">%</span>
      </span>
    </div>
  );
}

/** Six life areas, icon-led so the row scans without reading a word. */
export function RashifalDomains({ card }: { card: Card }) {
  if (!card.domains.length) return null;
  return (
    <ul className={cn(rashifalClasses.domainGrid, rashifalClasses.domains)}>
      {card.domains.map((domain) => {
        const Icon = RASHIFAL_DOMAIN_ICON[domain.key];
        return (
          <li key={domain.key} className={rashifalClasses.domain} title={domain.title}>
            <div className={rashifalClasses.domainHead}>
              <Icon className={cn("size-3.5 shrink-0", rashifalToneText(domain.tone))} aria-hidden="true" />
              <span className={cn("truncate", rashifalClasses.domainLabel)}>{domain.label}</span>
            </div>
            <div className={rashifalClasses.domainTrack}>
              <div className={cn(rashifalClasses.domainFill, rashifalToneBar(domain.tone))} style={{ width: `${domain.percent}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RashifalLucky({ card, className }: { card: Card; className: string }) {
  return (
    <div className={cn("grid", className, rashifalClasses.lucky)}>
      {card.lucky.map(({ key, label, value }) => {
        const Icon = RASHIFAL_LUCKY_ICON[key];
        return (
          <div key={key} className={cn("flex", rashifalClasses.luckyCell)} title={label}>
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{label}: </span>
            <span className={cn("truncate", rashifalClasses.luckyValue)}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RashifalWhyButton({ card, detailsId }: { card: Card; detailsId: string }) {
  return (
    <button
      type="button"
      className={cn("flex", rashifalClasses.whyButton, rashifalClasses.whyLabel, rashifalClasses.whyButtonHover)}
      aria-expanded={card.open}
      aria-controls={detailsId}
      onClick={card.toggle}
    >
      {card.whyLabel}
      <ChevronDown className={cn("size-4 transition-transform", card.open && "rotate-180")} aria-hidden="true" />
    </button>
  );
}

/** The score components and the transit chips at the top of the details. */
export function RashifalComponents({ card }: { card: Card }) {
  return (
    <>
      {card.components.length ? (
        <ul className={cn(rashifalClasses.componentListReset, rashifalClasses.componentList)}>
          {card.components.map((c) => (
            <li key={c.key} className={cn("m-0 flex", rashifalClasses.componentRow)}>
              <span className={rashifalClasses.componentLabel}>{c.label}</span>
              <span className={rashifalClasses.componentNote}>{c.note}</span>
              <span className={cn(rashifalClasses.componentValue, rashifalToneText(c.tone))}>{c.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.gochar.length ? <RashifalGocharChips rows={card.gochar} className="mt-3" /> : null}
    </>
  );
}
