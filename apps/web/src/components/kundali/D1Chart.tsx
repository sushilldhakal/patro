import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { aspectHousesFor, drishtiTargetHouses, type BhavaHouse } from "@/lib/bhava";
import { useTranslation } from "react-i18next";
import {
  NI_HOUSE_POLYGONS,
  planetGridLayout,
  pointsToSvg,
  polygonCentroid,
} from "@/lib/kundali/north-indian-layout";
import { cn } from "@/lib/utils";
import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText, type Lang } from "@/i18n/locale";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import {
  bhavaReferenceKeys,
  fetchBhavaReference,
  type BhavaReferencePayload,
} from "@/lib/api";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";

/** Catalogue key for each planet's two-letter glyph label. */
const PLANET_ABBR_KEY: Record<string, string> = {
  sun: "kundali.x.abbr_sun",
  moon: "kundali.x.abbr_moon",
  mars: "kundali.x.abbr_mars",
  mercury: "kundali.x.abbr_mercury",
  jupiter: "kundali.x.abbr_jupiter",
  venus: "kundali.x.abbr_venus",
  saturn: "kundali.x.abbr_saturn",
  rahu: "kundali.x.abbr_rahu",
  ketu: "kundali.x.abbr_ketu",
};

/** Western signs from i18n (Aries, Leo, …). */

interface Props {
  houses: BhavaHouse[];
}

type Selected = { key: string; house: number };

function formatHouseList(houses: number[], lang: Lang, digits: (v: number) => string): string {
  const parts = houses.map((h) => digits(h));
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(", ");
  return lang === "en" ? `${rest} and ${last}` : `${rest} र ${last}`;
}

/** "क्रूर (छाया) दृष्टि" / "Malefic (Shadow) Aspect" — pure display logic over
 * the fetched isMalefic/isChaya flags, not itself interpretive content. */
function drishtiBadgeText(grahaKey: string, ref: BhavaReferencePayload, lang: Lang): string {
  const info = ref.grahaDrishti[grahaKey];
  if (!info) return "";
  if (lang === "en") {
    const nature = info.isMalefic ? "Malefic" : "Benefic";
    return info.isChaya ? `${nature} (Shadow) Aspect` : `${nature} Aspect`;
  }
  const nature = info.isMalefic ? "क्रूर" : "सौम्य";
  return info.isChaya ? `${nature} (छाया) दृष्टि` : `${nature} दृष्टि`;
}

function DrishtiPanel({
  selected,
  reference,
  onClose,
}: {
  selected: Selected;
  reference: BhavaReferencePayload;
  onClose: () => void;
}) {
  const { lang, digits } = useLocale();
  const grahaKey = selected.key as GrahaKey;
  const info = reference.grahaDrishti[grahaKey];
  if (!info) return null;

  // The panel names the aspect by its classical offset (Jupiter is always
  // "described" as casting its 5th/7th/9th aspect, regardless of which
  // absolute house that lands on in this chart) — the arrows below still
  // point at the resolved absolute houses via drishtiTargetHouses.
  const offsets = aspectHousesFor(selected.key);
  const houseList = formatHouseList(offsets, lang, digits);
  const name = bilingualText(lang, GRAHA_NAME[grahaKey]?.ne, GRAHA_NAME[grahaKey]?.en, grahaKey);
  const badge = drishtiBadgeText(grahaKey, reference, lang);
  const badgeCls = info.isMalefic
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

  return (
    <div className="mt-3 w-full max-w-[340px] mx-auto space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {bilingualText(
            lang,
            `${name}को दृष्टि: ${houseList} भावमा`,
            `${name}'s aspect: houses ${houseList}`,
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={bilingualText(lang, "बन्द गर्नुहोस्", "Close")}
          className="shrink-0 text-muted-foreground hover:text-foreground text-sm leading-none"
        >
          ✕
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {bilingualText(lang, "दृष्टिको फल", "Aspect effect")}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-semibold leading-none",
              badgeCls,
            )}
          >
            {badge}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{bilingualText(lang, info.summaryNe, info.summaryEn)}</p>
      </div>
    </div>
  );
}

export function D1Chart({ houses }: Props) {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();
  const byHouse = new Map(houses.map((h) => [h.house, h]));
  const [selected, setSelected] = useState<Selected | null>(null);
  const [openHouse, setOpenHouse] = useState<number | null>(null);

  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });
  const reference = referenceQ.data;

  const targetHouses = useMemo(
    () => (selected ? new Set(drishtiTargetHouses(selected.key, selected.house)) : null),
    [selected],
  );

  const togglePlanet = (key: string, house: number) => {
    setSelected((prev) => (prev && prev.key === key && prev.house === house ? null : { key, house }));
  };

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 300 300"
        className="w-full h-auto max-w-[340px] mx-auto"
        role="img"
        aria-label={t("kundali.north_indian_kundali_chart")}
      >
        <defs>
          <marker
            id="d1DrishtiArrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="fill-secondary" />
          </marker>
        </defs>
        <rect
          x="0"
          y="0"
          width="300"
          height="300"
          className="fill-background/60 dark:fill-background/40 stroke-border"
          strokeWidth="1.5"
          rx="4"
        />
        <line x1="0" y1="0" x2="300" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <line x1="300" y1="0" x2="0" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <polygon
          points="150,0 300,150 150,300 0,150"
          className="fill-none stroke-border/80"
          strokeWidth="1.25"
        />

        {Object.entries(NI_HOUSE_POLYGONS).map(([houseStr, points]) => {
          const houseNum = Number(houseStr);
          const house = byHouse.get(houseNum);
          const [cx, cy] = polygonCentroid(points);
          const planetLines = house?.planets ?? [];
          const hasPlanets = planetLines.length > 0;
          const isAspected = Boolean(targetHouses?.has(houseNum));

          return (
            <g
              key={houseNum}
              onClick={house ? () => setOpenHouse(houseNum) : undefined}
              onKeyDown={
                house
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenHouse(houseNum);
                      }
                    }
                  : undefined
              }
              role={house ? "button" : undefined}
              tabIndex={house ? 0 : undefined}
              aria-label={
                house
                  ? bilingualText(lang, `भाव ${digits(houseNum)}`, `House ${digits(houseNum)}`)
                  : undefined
              }
              className={house ? "cursor-pointer outline-none" : undefined}
            >
              <polygon
                points={pointsToSvg(points)}
                fill="transparent"
                style={{ pointerEvents: "all" }}
              />
              {house?.isLagna && (
                <polygon
                  points={pointsToSvg(points)}
                  className="fill-secondary/15 dark:fill-secondary/25"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {isAspected && !house?.isLagna && (
                <polygon points={pointsToSvg(points)} className="fill-secondary/10" style={{ pointerEvents: "none" }} />
              )}
              {house && (
                <text
                  x={cx}
                  y={cy - (hasPlanets ? 12 : 0)}
                  textAnchor="middle"
                  className={cn(
                    "text-sm font-semibold",
                    house.isLagna ? "fill-secondary" : "fill-muted-foreground"
                  )}
                >
                  {digits(house.rashi)} {formatRashiByNumber(house.rashi, lang)}
                </text>
              )}
              {(() => {
                if (!hasPlanets) return null;
                const layout = planetGridLayout(points, planetLines.length);
                return planetLines.map((planet, i) => {
                  const row = Math.floor(i / layout.columns);
                  const rowStart = row * layout.columns;
                  const itemsInRow = Math.min(layout.columns, planetLines.length - rowStart);
                  const col = i - rowStart;
                  const x = cx + (col - (itemsInRow - 1) / 2) * layout.colGap;
                  const y = cy + row * layout.rowGap;
                  const markSize = layout.fontSize * 0.5;
                  const abbrKey = PLANET_ABBR_KEY[planet.key];
                  const abbr = abbrKey ? t(abbrKey) : planet.labelNe.slice(0, 2);
                  const isSelected = selected?.key === planet.key && selected.house === houseNum;
                  const isClickable = Boolean(reference?.grahaDrishti[planet.key]);
                  return (
                    <g
                      key={planet.key}
                      onClick={
                        isClickable
                          ? (e) => {
                              e.stopPropagation();
                              togglePlanet(planet.key, houseNum);
                            }
                          : undefined
                      }
                      onKeyDown={
                        isClickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePlanet(planet.key, houseNum);
                              }
                            }
                          : undefined
                      }
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      className={isClickable ? "cursor-pointer outline-none" : undefined}
                    >
                      {isSelected && (
                        <circle
                          cx={x}
                          cy={y - layout.fontSize * 0.3}
                          r={layout.fontSize * 0.85}
                          className="fill-secondary/20"
                        />
                      )}
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        style={{ fontSize: `${layout.fontSize}px` }}
                        className={cn("text-base", isSelected ? "fill-secondary font-semibold" : "fill-foreground")}
                      >
                        {abbr}
                      </text>
                      {/* Marks sit just right of the abbreviation, aligned with
                          the glyph's mid-height — never lifted into the rashi
                          label above or crowded onto the neighbour. */}
                      <GrahaStatusMarksSvg
                        planetKey={planet.key}
                        isRetrograde={planet.isRetrograde}
                        isCombust={planet.isCombust}
                        x={x + layout.fontSize * 0.42}
                        y={y - markSize - layout.fontSize * 0.05}
                        size={markSize}
                      />
                    </g>
                  );
                });
              })()}
            </g>
          );
        })}

        {selected &&
          Array.from(targetHouses ?? []).map((targetHouse) => {
            if (targetHouse === selected.house) return null;
            const fromPoints = NI_HOUSE_POLYGONS[selected.house];
            const toPoints = NI_HOUSE_POLYGONS[targetHouse];
            if (!fromPoints || !toPoints) return null;
            const [x1, y1] = polygonCentroid(fromPoints);
            const [x2, y2] = polygonCentroid(toPoints);
            return (
              <line
                key={targetHouse}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-secondary"
                strokeWidth="1.5"
                opacity="0.85"
                markerEnd="url(#d1DrishtiArrow)"
              />
            );
          })}
      </svg>

      {selected && reference && (
        <DrishtiPanel selected={selected} reference={reference} onClose={() => setSelected(null)} />
      )}

      <BhavaDetailDialog
        houses={houses}
        houseNumber={openHouse}
        reference={reference}
        onClose={() => setOpenHouse(null)}
      />
    </div>
  );
}
