import { Baby, Clock3, Compass } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { useSaitDayCard } from "@vedic-patro/features/sait";
import { SuitabilityBadge } from "@vedic-patro/ui/kit/jyotish";

/**
 * One qualifying muhūrta day: the representative clean window plus the
 * panchāṅga that made the day survive the rules.
 */
export function SaitDayCard({
  d,
  index = 0,
  suitability,
  personalize,
}: {
  d: SaitDetailDay;
  index?: number;
  suitability?: SaitSuitability;
  personalize?: SaitPersonalizeDay;
}) {
  const card = useSaitDayCard({ d, personalize });
  const chip = (tone: keyof typeof saitClasses.toneChip) =>
    cn(saitClasses.chip, "inline-flex", saitClasses.chipText, saitClasses.toneChip[tone], saitClasses.toneChipText[tone]);

  return (
    <article
      className={cn(saitClasses.card, "animate-in fade-in fill-mode-both", suitability ? SUITABILITY_STYLE[suitability].ring : null)}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {suitability ? (
        <div className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </div>
      ) : null}
      <div className={saitClasses.cardHead}>
        <div className={saitClasses.dateBox}>
          <span className={saitClasses.dateMonth}>{card.month}</span>
          <span className={saitClasses.dateDay}>{card.day}</span>
        </div>

        <div className={saitClasses.headBody}>
          <div className={saitClasses.titleRow}>
            <h3 className={cn("m-0", saitClasses.weekday)}>{card.weekday}</h3>
            <span className={saitClasses.gregorian}>{card.gregorian}</span>
          </div>

          <div className={cn(saitClasses.windowChip, "inline-flex w-fit", saitClasses.windowText)}>
            <Clock3 className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className={saitClasses.windowTime}>{card.window}</span>
            <span className={cn("hidden sm:inline", saitClasses.windowNote)}>{card.windowNote}</span>
          </div>
        </div>
      </div>

      <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3", saitClasses.facts)}>
        {card.facts.map((r) => (
          <div key={r.label} className={saitClasses.factItem}>
            <dt className={saitClasses.factLabel}>{r.label}</dt>
            <dd className={cn("m-0 truncate", saitClasses.factValue)}>{r.value}</dd>
          </div>
        ))}
      </dl>

      {card.shuddhi ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRow}>
            <span className={saitClasses.blockLabel}>{card.shuddhi.label}</span>
            {card.shuddhi.planets.map((p) => (
              <span key={p.key} title={p.title} className={cn(chip(p.tone), saitClasses.chipGap, saitClasses.chipNum)}>
                {p.name}
                <span>{p.house}</span>
              </span>
            ))}
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.shuddhi.tone])}>
            {card.shuddhi.summary}
            <span className={cn("ml-1", saitClasses.summaryNote)}>{card.shuddhi.note}</span>
          </p>
        </div>
      ) : null}

      {card.kumbha ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRowLoose}>
            <span className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Compass className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {card.kumbha.label}
            </span>
            <span className={chip(card.kumbha.tone)}>{card.kumbha.zone}</span>
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.kumbha.tone])}>
            {card.kumbha.effect}
            <span className={cn("ml-1", saitClasses.summaryNote)}>{card.kumbha.note}</span>
          </p>
        </div>
      ) : null}

      {card.anna ? (
        <div className={saitClasses.block}>
          <div className={saitClasses.blockRowLoose}>
            <span className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Baby className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {card.anna.label}
            </span>
            <span className={cn(chip(card.anna.tone), saitClasses.chipNum)}>{card.anna.month}</span>
          </div>
          <p className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.anna.tone])}>{card.anna.summary}</p>
        </div>
      ) : null}
    </article>
  );
}

export default SaitDayCard;
