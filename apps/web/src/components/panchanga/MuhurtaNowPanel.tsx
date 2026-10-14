import type { PanchangaDay } from "@/lib/api";
import { cn } from "@vedic-patro/domain/utils";
import { useEphemerisModeBanner, useMuhurtaNow } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

interface Props {
  p: PanchangaDay;
  clock?: string;
  /** Civil AD date (YYYY-MM-DD) the user is viewing — not necessarily today. */
  viewedDateAd?: string;
}

export function MuhurtaNowPanel({ p, clock }: Props) {
  const card = useMuhurtaNow({ p, clock });
  if (!card) return null;

  return (
    <div className={panchangaPageClasses.aside.card}>
      <div className={panchangaPageClasses.aside.muhurtaEyebrow}>{card.title}</div>
      {card.instant && <p className={panchangaPageClasses.aside.muhurtaInstant}>{card.instant}</p>}
      <ul className={cn("m-0 list-none p-0", panchangaPageClasses.aside.muhurtaList)}>
        {card.rows.map((row) => (
          <li
            key={row.key}
            className={cn(
              "flex",
              panchangaPageClasses.aside.muhurtaRow,
              row.active ? panchangaPageClasses.aside.muhurtaRowActive : panchangaPageClasses.aside.muhurtaRowIdle
            )}
          >
            <span>
              <span className="font-semibold">{row.label}</span>
            </span>
            <span className={panchangaPageClasses.aside.muhurtaValue}>
              <span className={row.active ? panchangaPageClasses.aside.muhurtaActive : panchangaPageClasses.aside.muhurtaRange}>
                {row.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EphemerisModeBanner({ p, clock, viewedDateAd }: Props) {
  const banner = useEphemerisModeBanner({ p, clock, viewedDateAd });
  return (
    <div className={panchangaPageClasses.aside.banner}>
      <p className={panchangaPageClasses.aside.bannerTitle}>{banner.title}</p>
      <p className={panchangaPageClasses.aside.bannerBody}>
        {banner.body.map((run, i) => (
          <span key={i} className={run.mono ? "font-mono tabular-nums" : undefined}>
            {run.text}
          </span>
        ))}
      </p>
    </div>
  );
}
