import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharSkyCards } from "@vedic-patro/features/gochar";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { patroCard, patroMono } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

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
  const { cards, copy } = useGocharSkyCards(gochar);

  return (
    <section className={cn(patroCard, gocharClasses.skyCard, "shadow-ring-soft")}>
      <div className={gocharClasses.skyHead}>
        <p className={cn("m-0", gocharClasses.skyEyebrow)}>{copy.eyebrow}</p>
        <h2 className={cn("mb-0", gocharClasses.skyTitle)}>{copy.title}</h2>
        <p className={cn("mb-0", gocharClasses.skyDate)}>{dateLabel}</p>
      </div>

      <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", gocharClasses.skyGrid)}>
        {cards.map((card) => {
          const key = card.key;
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
                    <span>{card.name}</span>
                    <span className="font-bold">{card.rashi}</span>
                    <span>{card.deg}</span>
                    <GrahaStatusBadges
                      planetKey={key}
                      isRetrograde={card.isRetrograde}
                      isCombust={card.isCombust}
                      size={13}
                    />
                  </p>
                </div>
                {card.exalted ? (
                  <span className={cn(gocharClasses.exaltedBadge, gocharClasses.exaltedBadgeText)}>
                    {copy.exalted}
                  </span>
                ) : null}
              </div>

              {/* Card body */}
              <div className={cn("flex flex-col px-3", gocharClasses.planetBody)}>
                <MetaRow label={copy.nakshatra} value={card.nakshatra} />
                <MetaRow label={copy.motion} value={card.motion} />
              </div>

              {/* Card footer */}
              {card.footer ? (
                <div className={cn("mt-auto px-3", gocharClasses.planetFooter)}>
                  <p className={cn("m-0", gocharClasses.planetFooterText)}>
                    {card.footer}
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
