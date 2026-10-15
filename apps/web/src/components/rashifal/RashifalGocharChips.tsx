import { cn } from "@vedic-patro/domain/utils";
import { RASHIFAL_FLAG_ICON } from "@/lib/rashifal-ui";
import type { RashifalGocharRow } from "@/lib/api";
import { useRashifalGocharChips, type RashifalGocharFlag } from "@vedic-patro/features/rashifal";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

const TONE = {
  vedha: rashifalClasses.gochar.toneVedha,
  good: rashifalClasses.gochar.toneGood,
  bad: rashifalClasses.gochar.toneBad,
} as const;

const FLAG_COLOR: Record<RashifalGocharFlag, string> = {
  vedha: "text-muted-foreground",
  retrograde: "text-secondary",
  combust: "text-destructive",
};

function FlagIcon({ flag }: { flag: RashifalGocharFlag }) {
  const Icon = RASHIFAL_FLAG_ICON[flag];
  return <Icon className={cn("size-3", FLAG_COLOR[flag])} aria-hidden="true" />;
}

/**
 * The nine-graha gochar strip inside "why this reading?" — one chip per graha
 * with the house counted from the sign, plus the three transit flags.
 *
 * The flags are icon-only, so each one carries its own tooltip/aria-label and
 * the strip closes with a legend: वेध (Ban) on its own reads as a broken or
 * blocked glyph rather than "this transit is cancelled". वक्री and अस्त keep
 * the same colours as {@link GrahaStatusBadges} everywhere else in the app —
 * secondary for वक्री, destructive for अस्त — so one icon means one thing
 * across the whole site.
 */
export function RashifalGocharChips({
  rows,
  className,
}: {
  rows: RashifalGocharRow[];
  className?: string;
}) {
  const { chips, legend } = useRashifalGocharChips(rows);

  if (!chips.length) return null;

  return (
    <div className={cn(rashifalClasses.gochar.wrap, className)}>
      <ul className={cn("m-0 flex list-none flex-wrap p-0", rashifalClasses.gochar.list)}>
        {chips.map((chip) => (
          <li
            key={chip.key}
            className={cn("m-0 inline-flex", rashifalClasses.gochar.chip, rashifalClasses.gochar.chipText, TONE[chip.tone])}
            title={chip.hint}
          >
            <span>{chip.graha}</span>
            <span className={rashifalClasses.gochar.house}>{chip.house}</span>
            {chip.flags.map((f) => (
              <span key={f.flag} className="inline-flex" title={f.label} aria-label={f.label}>
                <FlagIcon flag={f.flag} />
              </span>
            ))}
          </li>
        ))}
      </ul>

      {legend.length ? (
        <p className={cn("m-0 flex flex-wrap items-center", rashifalClasses.gochar.legend, rashifalClasses.gochar.legendText)}>
          {legend.map((f) => (
            <span key={f.flag} className={cn("inline-flex", rashifalClasses.gochar.legendItem)}>
              <FlagIcon flag={f.flag} />
              {f.label}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
