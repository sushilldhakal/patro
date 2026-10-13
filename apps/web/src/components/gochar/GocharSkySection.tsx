import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { GRAHA_NAME, GRAHA_DETAIL_ORDER } from "@vedic-patro/domain/graha-details";
import { grahaExalted, grahaNakshatraLine, formatGocharPatroDate, motionLabel } from "@vedic-patro/domain/gochar-page-utils";
import { grahaRashiDisplay } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroCard, patroMono } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
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
    <p className={cn("m-0", gocharClasses.metaRow)}>
      <span className={gocharClasses.metaLabel}>{label}</span>{" "}
      <span className={gocharClasses.metaValue}>{value}</span>
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
    <section className={cn(patroCard, gocharClasses.skyCard, "shadow-ring-soft")}>
      <div className={gocharClasses.skyHead}>
        <p className={cn("m-0", gocharClasses.skyEyebrow)}>
          {tFor(lang, "ui.gochar.the_sky_at_a_glance")}
        </p>
        <h2 className={cn("mb-0", gocharClasses.skyTitle)}>
          {tFor(lang, "ui.gochar.live_graha_positions")}
        </h2>
        <p className={cn("mb-0", gocharClasses.skyDate)}>{dateLabel}</p>
      </div>

      <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", gocharClasses.skyGrid)}>
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
                "relative flex flex-col text-left",
                gocharClasses.planetCard,
                "transition-[box-shadow,transform] hover:shadow-md hover:shadow-secondary/10 active:scale-[0.995]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                selectedPlanet === key
                  ? "shadow-[0_0_0_2px_var(--secondary)]"
                  : "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]",
              )}
            >
              <span className={cn(gocharClasses.planetStripe, PLANET_STRIPE[key])} aria-hidden />

              {/* Card header — icon + title (name + sign + degree) */}
              <div className={cn("flex", gocharClasses.planetHead)}>
                <GrahaPlanetIcon graha={key} size={32} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "m-0 flex",
                      gocharClasses.planetTitleWrap,
                      gocharClasses.planetTitle,
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
                  <span className={cn(gocharClasses.exaltedBadge, gocharClasses.exaltedBadgeText)}>
                    {tFor(lang, "ui.gochar.exalted")}
                  </span>
                ) : null}
              </div>

              {/* Card body */}
              <div className={cn("flex flex-col px-3", gocharClasses.planetBody)}>
                <MetaRow
                  label={tFor(lang, "nakshatra")}
                  value={grahaNakshatraLine(g, lang, digits)}
                />
                <MetaRow
                  label={tFor(lang, "ui.gochar.motion")}
                  value={motionLabel(g, lang)}
                />
              </div>

              {/* Card footer */}
              {untilAd ? (
                <div className={cn("mt-auto px-3", gocharClasses.planetFooter)}>
                  <p className={cn("m-0", gocharClasses.planetFooterText)}>
                    {tFor(lang, "ui.gochar.in_rashiuntil_until_lang", { rashiUntil, lang: formatGocharPatroDate(untilAd, lang) })}
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
