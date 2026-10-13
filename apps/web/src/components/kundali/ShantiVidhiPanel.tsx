import { useRef } from "react";
import { Trans } from "@vedic-patro/i18n/react";
import { useShantiVidhiPanel, type ShantiFindingCard as ShantiFindingCardData } from "@vedic-patro/features/shanti";
import {
  Flame,
  Gem,
  Sparkles,
  HandCoins,
  TreePine,
  CalendarDays,
  ArrowDownToLine,
  Compass,
  UserRound,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpenText,
  Flower2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@/lib/api";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const sh = kundaliDetailClasses.shanti;

const th = "whitespace-nowrap text-xs font-semibold";

type TileKey = ReturnType<typeof useShantiVidhiPanel>["detail"]["tiles"][number]["key"];
const TILE_ICONS: Record<TileKey, React.ReactNode> = {
  samidha: <TreePine className="h-4 w-4" />,
  gem: <Gem className="h-4 w-4" />,
  metal: <Sparkles className="h-4 w-4" />,
  deity: <Flame className="h-4 w-4" />,
  pratyadhidevata: <UserRound className="h-4 w-4" />,
  disha: <Compass className="h-4 w-4" />,
  pooja: <Flower2 className="h-4 w-4" />,
};

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={cn(sh.tile, "flex")}>
      <div className="mt-0.5 text-secondary">{icon}</div>
      <div className="min-w-0">
        <div className={sh.tileLabel}>{label}</div>
        <div className={sh.tileValue}>{value}</div>
      </div>
    </div>
  );
}

const REMEDY_BADGE_CLASS: Record<GrahaShantiFinding["remedy"], string> = {
  shanti: cn(sh.remedyShanti, sh.remedyShantiText),
  strengthen: cn(sh.remedyStrengthen, sh.remedyStrengthenText),
  pacify: cn(sh.remedyPacify, sh.remedyPacifyText),
  pacify_transit: cn(sh.remedyPacify, sh.remedyPacifyText),
  soothe: cn(sh.remedySoothe, sh.remedySootheText),
};

/**
 * One trigger of the server-computed classical 4-step Graha Shanti decision
 * process (see `GrahaShantiFinding`) — not a client-side heuristic.
 */
function ShantiFindingCard({
  card,
  onSelect,
}: {
  card: ShantiFindingCardData;
  onSelect: (key: string) => void;
}) {
  return (
    <div className={sh.finding}>
      <div className={cn(sh.findingHead, "flex")}>
        <span className={sh.findingStep}>{card.step}</span>
        <span
          className={cn(
            sh.remedyBadge,
            sh.remedyBadgeText,
            REMEDY_BADGE_CLASS[card.remedy],
          )}
        >
          {card.remedyLabel}
        </span>
      </div>
      <div className={cn(sh.findingGraha, "flex")}>
        <GrahaPlanetIcon graha={card.graha as GrahaKey} size={28} />
        <span className={sh.findingName}>{card.name}</span>
      </div>
      <p className={sh.findingReason}>{card.reason}</p>
      <button
        type="button"
        onClick={() => onSelect(card.graha)}
        className={cn(sh.findingButton, sh.findingButtonText, "inline-flex transition-colors hover:bg-secondary/20")}
      >
        <ArrowDownToLine className="h-3.5 w-3.5" /> {card.viewLabel}
      </button>
    </div>
  );
}

/**
 * Navagraha Shanti recommendations + reference. `grahaShanti` is the
 * server-computed classical 4-step decision (dasha assessment, Lagnesha/
 * Yogakaraka strength, Rahu-Ketu-Saturn affliction, Saturn's Sade Sati/
 * Dhaiya transit) — see `GrahaShantiRecommendation` in `lib/api.ts`. Used
 * standalone (ShantiVidhi page) and embedded in each kundali (KundaliView).
 * No data fetching of its own.
 */
export function ShantiVidhiPanel({
  grahaShanti,
  isError = false,
}: {
  grahaShanti?: GrahaShantiRecommendation;
  isError?: boolean;
}) {
  const detailRef = useRef<HTMLDivElement>(null);
  const panel = useShantiVidhiPanel({
    grahaShanti,
    isError,
    scrollToDetail: () => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });
  const { detail, copy } = panel;

  return (
    <div className={sh.root}>
      {/* recommendations from this chart — server-computed 4-step decision */}
      {panel.status === "error" ? (
        <div className={cn(sh.errorBox, sh.errorText)}>{copy.loadError}</div>
      ) : panel.status === "findings" ? (
        <div className="space-y-3">
          {panel.groups.map((group) => (
            // One tier of findings, collapsible so a chart with many
            // simultaneous afflictions doesn't dump every card at once.
            <div key={group.tier}>
              <button
                type="button"
                onClick={group.toggle}
                className={cn(sh.groupToggle, sh.groupToggleText, "flex w-full transition-colors hover:bg-muted")}
              >
                <span>{group.title}</span>
                {group.open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {group.open && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {group.cards.map((card) => (
                    <ShantiFindingCard key={card.key} card={card} onSelect={panel.selectFinding} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(sh.emptyBox, sh.emptyText)}>{copy.empty}</div>
      )}
      <p className={sh.basisNote}>{copy.basisNote}</p>

      {/* graha selector */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {panel.selector.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => panel.select(g.key)}
            className={cn(
              sh.selector,
              "flex flex-col transition-colors",
              g.active
                ? cn(sh.selectorActive, sh.selectorTextActive)
                : cn(sh.selectorIdle, sh.selectorTextIdle, "hover:bg-muted"),
            )}
          >
            <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
            <span className={sh.selectorText}>{g.name}</span>
          </button>
        ))}
      </div>

      {/* selected graha detail */}
      <section ref={detailRef} className={cn(sh.detail, "scroll-mt-20")}>
        <header
          className={cn(sh.detailHead, "flex")}
          style={{ background: `linear-gradient(90deg, ${detail.colorHex}1f, transparent)` }}
        >
          <span
            className="flex w-1.5 self-stretch rounded-full shadow"
            style={{ backgroundColor: detail.colorHex }}
            aria-hidden
          />
          <GrahaPlanetIcon graha={detail.key as GrahaKey} size={40} className="shrink-0" />
          <div className="flex-1">
            <h2 className={sh.detailTitle}>{detail.title}</h2>
            <p className={sh.detailSubtitle}>{detail.subtitle}</p>
          </div>
          <div className={cn(sh.pills, "flex", sh.pillText)}>
            <span className={cn(sh.pill, "inline-flex")}>
              <CalendarDays className="h-3.5 w-3.5" /> {detail.vaara}
            </span>
            <span className={cn(sh.pill, "inline-flex")}>
              <Clock className="h-3.5 w-3.5" /> {detail.samaya}
            </span>
            <span className={cn(sh.pill, "inline-flex gap-1.5")}>
              <span className={sh.colorDot} style={{ backgroundColor: detail.colorHex }} />
              {detail.color}
            </span>
          </div>
        </header>

        <div className={cn(sh.detailBody, "space-y-5")}>
          {/* mantra + japa */}
          <div className={sh.mantraBox}>
            <div className={sh.mantraLabel}>{copy.beejaHeading}</div>
            <p className={sh.mantraBig}>{detail.beejMantra}</p>
            <p className={sh.japa}>
              <Trans
                i18nKey={detail.japaLine.i18nKey}
                values={detail.japaLine.values}
                components={{ v: <span className={sh.japaValue} /> }}
              />
            </p>
            <div className={sh.mantraSection}>
              <div className={sh.mantraLabel}>{copy.vedicHeading}</div>
              <p className={sh.vedic}>{detail.vedicMantra}</p>
            </div>
            <div className={sh.mantraSection}>
              <div className={sh.mantraLabel}>{copy.tantrikHeading}</div>
              <p className={sh.mantraBig}>{detail.tantrikMantra}</p>
            </div>
          </div>

          {/* stotram + yantra */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className={sh.stotramBox}>
              <div className={cn(sh.stotramHead, sh.tileLabel, "flex")}>
                <BookOpenText className="h-4 w-4 text-secondary" /> {copy.stotramHeading}
              </div>
              <p className={sh.stotram}>{detail.stotram}</p>
            </div>
            <div className={sh.stotramBox}>
              <div className={sh.yantraLabel}>{copy.yantraHeading}</div>
              <div className="mx-auto grid w-32 grid-cols-3 gap-1">
                {detail.yantra.map((n, i) => (
                  <div
                    key={i}
                    className={cn(sh.yantraCell, sh.yantraText, "flex aspect-square")}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tiles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.tiles.map((tile) => (
              <InfoTile key={tile.key} icon={TILE_ICONS[tile.key]} label={tile.label} value={tile.value} />
            ))}
          </div>

          {/* gem-wearing method */}
          <p className={cn(sh.noteBox, sh.noteText)}>
            <span className={sh.noteLabel}>{copy.gemDetailLabel}</span> {detail.gemDetail}
          </p>

          {/* daan */}
          <div>
            <div className={cn(sh.donationHead, sh.donationTitle, "flex")}>
              <HandCoins className="h-4 w-4 text-secondary" /> {copy.donationItems}
            </div>
            <div className={cn(sh.donationList, "flex")}>
              {detail.daan.map((item, idx) => (
                <span key={`${item}-${idx}`} className={cn(sh.donationChip, sh.donationChipText)}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className={cn(sh.noteBox, sh.noteText)}>
            <span className={sh.noteLabel}>{copy.useLabel}</span> {detail.remedy}
          </p>
        </div>
      </section>

      {/* full reference table */}
      <div>
        <h3 className={sh.refTitle}>{copy.referenceTitle}</h3>
        <div className={sh.refTable}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                {panel.reference.columns.map((label) => (
                  <TableHead key={label} className={th}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {panel.reference.rows.map((g) => (
                <TableRow
                  key={g.key}
                  className={cn("cursor-pointer", g.active && "bg-secondary/10 hover:bg-secondary/15")}
                  onClick={() => panel.select(g.key)}
                >
                  <TableCell className="whitespace-nowrap font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <GrahaPlanetIcon graha={g.key as GrahaKey} size={22} />
                      {g.name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{g.vaara}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.beejMantra}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.japa}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.samidha}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.gem}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.metal}</TableCell>
                  <TableCell className="max-w-56">
                    <span className={kundaliDetailClasses.prose.small}>{g.daan}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className={sh.refNote}>{copy.disclaimer}</p>
      </div>
    </div>
  );
}

export default ShantiVidhiPanel;
