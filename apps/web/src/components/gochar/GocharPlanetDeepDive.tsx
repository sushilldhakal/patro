import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@/lib/graha-details";
import { GRAHA_NAME, GRAHA_DETAIL_ORDER } from "@/lib/graha-details";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
  speedTone,
} from "@/lib/gochar-page-utils";
import { grahaRashiDisplay } from "@/lib/dainikKranti/gochar-display";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";

type Props = {
  gochar: Record<string, GocharGraha>;
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
};

function windowLine(
  labelNe: string,
  labelEn: string,
  entryLocal: string | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!entryLocal) return undefined;
  const datePart = entryLocal.slice(0, 10);
  const when = formatGocharPatroDate(datePart, lang);
  return lang === "en" ? `${labelEn} until ${when}` : `${labelNe} ${when} सम्म`;
}

export function GocharPlanetDeepDive({ gochar, selected, onSelect }: Props) {
  const { lang, digits } = useLocale();
  const g = gochar[selected];
  if (!g) return null;

  const name = bilingualText(lang, GRAHA_NAME[selected].ne, GRAHA_NAME[selected].en);
  const rashi = grahaRashiDisplay(g, lang);
  const deg =
    g.deg_in_rashi != null
      ? lang === "en"
        ? `${g.deg_in_rashi.toFixed(1)}°`
        : `${digits(g.deg_in_rashi.toFixed(1))}°`
      : "—";

  const windows = [
    windowLine(
      g.rashi_ne ?? g.rashi ?? "",
      g.rashi ?? "",
      g.next_rashi_entry?.entry_time_local,
      lang,
    ),
    windowLine(
      g.next_nakshatra_entry?.to_nakshatra_ne ?? "",
      g.next_nakshatra_entry?.to_nakshatra ?? "",
      g.next_nakshatra_entry?.entry_time_local,
      lang,
    ),
    g.next_pada_entry?.to_pada
      ? windowLine(
          `पद ${g.next_pada_entry.to_pada}`,
          `Pada ${g.next_pada_entry.to_pada}`,
          g.next_pada_entry.entry_time_local,
          lang,
        )
      : undefined,
  ].filter(Boolean) as string[];

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-ring-soft">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {bilingualText(lang, "विस्तृत अध्ययन", "Deep dive")}
        </p>
        <h2 className="mt-1 mb-0 break-words text-lg font-bold text-foreground">
          {bilingualText(lang, "ग्रह छान्नुहोस्", "Pick a planet")}
        </h2>
        <p className="mt-1 mb-0 break-words text-sm text-muted-foreground">
          {bilingualText(lang, "वर्तमान स्थिति, सीमा र वक्री", "Current position, windows & retrograde")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-3 sm:grid-cols-5 sm:px-5 lg:grid-cols-9">
        {GRAHA_DETAIL_ORDER.map((key) => {
          const row = gochar[key];
          if (!row) return null;
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors sm:px-3",
                active
                  ? "border-secondary bg-secondary/15 text-secondary"
                  : "border-border bg-surface-inset text-foreground hover:border-secondary/30",
              )}
            >
              <GrahaPlanetIcon graha={key} size={28} />
              <span className="w-full min-w-0 break-words text-[0.65rem] font-bold leading-tight">
                {bilingualText(lang, GRAHA_NAME[key].ne, GRAHA_NAME[key].en)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 border-t border-border px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <GrahaPlanetIcon graha={selected} size={36} />
          <h3 className="m-0 min-w-0 break-words text-xl font-bold text-foreground">
            {name}
            {g.name_vedic ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({g.name_vedic})</span>
            ) : null}
          </h3>
          {grahaExalted(selected, g) ? (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-200">
              {bilingualText(lang, "उच्च", "Exalted")}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={bilingualText(lang, "राशि", "Sign")} value={`${rashi} ${deg}`} />
          <Detail label={bilingualText(lang, "नक्षत्र", "Nakshatra")} value={grahaNakshatraLine(g, lang)} />
          <Detail label={bilingualText(lang, "गति", "Motion")} value={motionLabel(g, lang)} />
          <Detail label={bilingualText(lang, "वेग", "Speed")} value={speedTone(g, lang)} />
        </div>

        {windows.length > 0 ? (
          <div className="mt-4 rounded-xl bg-surface-inset p-3.5">
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {bilingualText(lang, "हालका सीमाहरू", "Current windows")}
            </p>
            <ul className="mt-2 mb-0 list-disc space-y-1 pl-4 text-sm text-foreground">
              {windows.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
      <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
