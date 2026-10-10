import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@/lib/graha-details";
import { GRAHA_NAME, GRAHA_DETAIL_ORDER } from "@/lib/graha-details";
import { grahaExalted, grahaNakshatraLine, formatGocharPatroDate, motionLabel } from "@/lib/gochar-page-utils";
import { grahaRashiDisplay } from "@/lib/dainikKranti/gochar-display";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroCard, patroMono } from "@/lib/patro-classes";
import { cn } from "@/lib/utils";

const PLANET_STRIPE: Record<GrahaKey, string> = {
  sun: "bg-amber-500",
  moon: "bg-slate-400",
  mars: "bg-red-500",
  mercury: "bg-emerald-500",
  jupiter: "bg-orange-500",
  venus: "bg-sky-500",
  saturn: "bg-indigo-500",
  rahu: "bg-violet-500",
  ketu: "bg-rose-600",
};

type Props = {
  gochar: Record<string, GocharGraha>;
  dateLabel: string;
  onSelectPlanet?: (key: GrahaKey) => void;
  /**
   * Ring the card for this graha. The 3D sky page pairs the grid with the
   * canvas and uses this to show which one is picked out up there.
   */
  selectedPlanet?: GrahaKey | null;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="m-0 text-sm leading-snug">
      <span className="text-muted-foreground">{label}</span>{" "}
      <span className="font-semibold text-foreground">{value}</span>
    </p>
  );
}

export function GocharSkySection({
  gochar,
  dateLabel,
  onSelectPlanet,
  selectedPlanet,
}: Props) {
  const { lang, digits } = useLocale();

  return (
    <section className={cn(patroCard, "min-w-0 max-w-full shadow-ring-soft")}>
      <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5 sm:py-5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-secondary">
          {bilingualText(lang, "आकाश एक नजरमा", "The sky at a glance")}
        </p>
        <h2 className="mt-1.5 mb-0 text-lg font-bold leading-snug text-foreground sm:text-xl">
          {bilingualText(lang, "प्रत्यक्ष ग्रह स्थिति", "Live graha positions")}
        </h2>
        <p className="mt-1 mb-0 text-sm font-semibold text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-3">
        {GRAHA_DETAIL_ORDER.map((key) => {
          const g = gochar[key];
          if (!g) return null;
          const name = bilingualText(lang, GRAHA_NAME[key].ne, GRAHA_NAME[key].en);
          const rashi = grahaRashiDisplay(g, lang);
          const deg =
            g.deg_in_rashi != null
              ? lang === "en"
                ? `${g.deg_in_rashi.toFixed(1)}°`
                : `${digits(g.deg_in_rashi.toFixed(1))}°`
              : "—";
          const exalted = grahaExalted(key, g);
          const untilAd = g.next_rashi_entry?.entry_time_local?.slice(0, 10);
          const rashiUntil = rashi ?? (lang === "en" ? g.rashi : g.rashi_ne);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectPlanet?.(key)}
              aria-pressed={selectedPlanet != null ? selectedPlanet === key : undefined}
              className={cn(
                "relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-background text-left",
                "transition-[box-shadow,transform] hover:shadow-md hover:shadow-secondary/10 active:scale-[0.995]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                selectedPlanet === key
                  ? "shadow-[0_0_0_2px_var(--secondary)]"
                  : "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]",
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 z-[1] w-1", PLANET_STRIPE[key])} aria-hidden />

              {/* Card header — icon + title (name + sign + degree) */}
              <div className="flex items-center gap-2.5 border-b border-border/70 bg-muted/25 py-2.5 pl-4 pr-3">
                <GrahaPlanetIcon graha={key} size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-bold leading-snug text-foreground",
                      patroMono,
                      "tabular-nums",
                    )}
                  >
                    <span>{name}</span>
                    <span className="font-bold">{rashi}</span>
                    <span>{deg}</span>
                    <GrahaStatusBadges
                      planetKey={key}
                      isRetrograde={g.is_retrograde}
                      isCombust={g.is_combust}
                      size={13}
                    />
                  </p>
                </div>
                {exalted ? (
                  <span className="shrink-0 rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-900 dark:text-amber-100">
                    {bilingualText(lang, "उच्च", "Exalted")}
                  </span>
                ) : null}
              </div>

              {/* Card body */}
              <div className="flex flex-col gap-1 px-3 py-2.5 pl-4">
                <MetaRow
                  label={bilingualText(lang, "नक्षत्र", "Nakshatra")}
                  value={grahaNakshatraLine(g, lang, digits)}
                />
                <MetaRow
                  label={bilingualText(lang, "गति", "Motion")}
                  value={motionLabel(g, lang)}
                />
              </div>

              {/* Card footer */}
              {untilAd ? (
                <div className="mt-auto border-t border-border/70 bg-muted/15 px-3 py-2 pl-4">
                  <p className="m-0 text-sm leading-snug text-muted-foreground">
                    {lang === "en"
                      ? `In ${rashiUntil} until ${formatGocharPatroDate(untilAd, lang)}`
                      : `${rashiUntil} मा ${formatGocharPatroDate(untilAd, lang)} सम्म`}
                  </p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
