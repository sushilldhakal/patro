import { Link } from "@tanstack/react-router";
import type { LocationParams } from "@/lib/api";
import { usePlanetEvents } from "@vedic-patro/features/panchanga";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { patroCard } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

interface Props {
  /** Civil-day Julian identity from panchanga (`jd_ut`). */
  jdUt: number;
  /** Civil `date_ad` from panchanga (for relative day math). */
  refDateAd?: string;
  location: LocationParams;
  /** For “view more” link — full location object with search params. */
  browseLocation?: PanchangaLocation;
}

export function PlanetEventsPanel({ jdUt, refDateAd, location, browseLocation }: Props) {
  const era = useCalendarEra();
  const panel = usePlanetEvents({ jdUt, refDateAd, location });

  return (
    <div className={`${patroCard} ${panchangaPageClasses.aside.eventsCard}`}>
      <div className={`flex ${panchangaPageClasses.aside.eventsHead}`}>
        <h2 className={panchangaPageClasses.aside.eventsTitle}>{panel.title}</h2>
        {browseLocation ? (
          <Link
            to="/gochar"
            search={patroRouteLinkSearch("/gochar", browseLocation, era) as Record<string, unknown>}
            className={`${panchangaPageClasses.aside.eventsLink} ${panchangaPageClasses.aside.eventsLinkText} transition-colors hover:border-secondary/40 hover:bg-secondary/10`}
          >
            {panel.viewMore}
          </Link>
        ) : null}
      </div>

      {panel.stateText ? <div className={panchangaPageClasses.aside.eventsStatus}>{panel.stateText}</div> : null}

      {panel.status === "ready" && (
        <div className={`flex ${panchangaPageClasses.aside.eventsList}`}>
          {panel.events.map((e) => (
            <div key={e.key} className={`flex ${panchangaPageClasses.aside.eventsRow}`}>
              <span className={`flex ${panchangaPageClasses.aside.eventsBody}`}>
                <span className={panchangaPageClasses.aside.eventsName}>{e.text}</span>
                <span className={panchangaPageClasses.aside.eventsName}>
                  <span className="font-mono">{e.time}</span>
                </span>
              </span>
              <span className={panchangaPageClasses.aside.eventsRel}>{e.rel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
