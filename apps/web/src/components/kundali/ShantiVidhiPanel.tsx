import { useMemo, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
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
import { NAVAGRAHA_SHANTI, getGrahaShanti } from "@vedic-patro/domain/shanti/navagraha-shanti";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const sh = kundaliDetailClasses.shanti;

const th = "whitespace-nowrap text-xs font-semibold";

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
  finding,
  onSelect,
}: {
  finding: GrahaShantiFinding;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const graha = getGrahaShanti(finding.graha);
  const nameNe = graha?.nameNe ?? finding.grahaNe;
  const nameEn = graha?.nameEn ?? finding.graha;
  return (
    <div className={sh.finding}>
      <div className={cn(sh.findingHead, "flex")}>
        <span className={sh.findingStep}>
          {bilingualText(lang, finding.stepTitleNe, finding.stepTitleEn)}
        </span>
        <span
          className={cn(
            sh.remedyBadge,
            sh.remedyBadgeText,
            REMEDY_BADGE_CLASS[finding.remedy],
          )}
        >
          {t(`kundali.x.shanti_remedy_${finding.remedy}`)}
        </span>
      </div>
      <div className={cn(sh.findingGraha, "flex")}>
        <GrahaPlanetIcon graha={finding.graha as GrahaKey} size={28} />
        <span className={sh.findingName}>{bilingualText(lang, nameNe, nameEn)}</span>
      </div>
      <p className={sh.findingReason}>{bilingualText(lang, finding.reasonNe, finding.reasonEn)}</p>
      <button
        type="button"
        onClick={() => onSelect(finding.graha)}
        className={cn(sh.findingButton, sh.findingButtonText, "inline-flex transition-colors hover:bg-secondary/20")}
      >
        <ArrowDownToLine className="h-3.5 w-3.5" /> {bilingualText(lang, `${nameNe} शान्ति हेर्नुहोस्`, `View ${nameEn} shanti`)}
      </button>
    </div>
  );
}

/**
 * One tier ("critical" or "core") of findings, collapsible so a chart with
 * many simultaneous afflictions (a real stellium can produce 8-12 findings)
 * doesn't dump every card on the user at once.
 */
function ShantiFindingsGroup({
  title,
  findings,
  onSelect,
  defaultOpen,
}: {
  title: string;
  findings: GrahaShantiFinding[];
  onSelect: (key: string) => void;
  defaultOpen: boolean;
}) {
  const { digits } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  if (findings.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(sh.groupToggle, sh.groupToggleText, "flex w-full transition-colors hover:bg-muted")}
      >
        <span>{title} ({digits(findings.length)})</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {findings.map((finding, idx) => (
            <ShantiFindingCard
              key={`${finding.step}-${finding.graha}-${finding.remedy}-${idx}`}
              finding={finding}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
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
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const [selectedKey, setSelectedKey] = useState("saturn");
  const detailRef = useRef<HTMLDivElement>(null);
  const graha = useMemo(() => getGrahaShanti(selectedKey) ?? NAVAGRAHA_SHANTI[0], [selectedKey]);
  const findings = useMemo(() => grahaShanti?.findings ?? [], [grahaShanti]);
  const criticalFindings = useMemo(() => findings.filter((f) => f.tier === "critical"), [findings]);
  const coreFindings = useMemo(() => findings.filter((f) => f.tier === "core"), [findings]);

  const selectAndScroll = (key: string) => {
    setSelectedKey(key);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className={sh.root}>
      {/* recommendations from this chart — server-computed 4-step decision */}
      {isError ? (
        <div className={cn(sh.errorBox, sh.errorText)}>
          {t("kundali.x.shanti_load_error")}
        </div>
      ) : findings.length > 0 ? (
        <div className="space-y-3">
          <ShantiFindingsGroup
            title={t("kundali.x.shanti_tier_critical")}
            findings={criticalFindings}
            onSelect={selectAndScroll}
            defaultOpen
          />
          <ShantiFindingsGroup
            title={t("kundali.x.shanti_tier_core")}
            findings={coreFindings}
            onSelect={selectAndScroll}
            defaultOpen={criticalFindings.length === 0}
          />
        </div>
      ) : (
        <div className={cn(sh.emptyBox, sh.emptyText)}>
          {t("kundali.x.shanti_findings_empty")}
        </div>
      )}
      <p className={sh.basisNote}>
        {t("kundali.x.shanti_basis_note")}
      </p>

      {/* graha selector */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {NAVAGRAHA_SHANTI.map((g) => {
          const active = g.key === selectedKey;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setSelectedKey(g.key)}
              className={cn(
                sh.selector,
                "flex flex-col transition-colors",
                active
                  ? cn(sh.selectorActive, sh.selectorTextActive)
                  : cn(sh.selectorIdle, sh.selectorTextIdle, "hover:bg-muted"),
              )}
            >
              <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
              <span className={sh.selectorText}>{bilingualText(lang, g.nameNe, g.nameEn)}</span>
            </button>
          );
        })}
      </div>

      {/* selected graha detail */}
      <section ref={detailRef} className={cn(sh.detail, "scroll-mt-20")}>
        <header
          className={cn(sh.detailHead, "flex")}
          style={{ background: `linear-gradient(90deg, ${graha.colorHex}1f, transparent)` }}
        >
          <span
            className="flex w-1.5 self-stretch rounded-full shadow"
            style={{ backgroundColor: graha.colorHex }}
            aria-hidden
          />
          <GrahaPlanetIcon graha={graha.key as GrahaKey} size={40} className="shrink-0" />
          <div className="flex-1">
            <h2 className={sh.detailTitle}>{bilingualText(lang, `${graha.nameNe} शान्ति`, `${graha.nameEn} Shanti`)}</h2>
            <p className={sh.detailSubtitle}>{bilingualText(lang, graha.nameEn, graha.nameNe)}</p>
          </div>
          <div className={cn(sh.pills, "flex", sh.pillText)}>
            <span className={cn(sh.pill, "inline-flex")}>
              <CalendarDays className="h-3.5 w-3.5" /> {bilingualText(lang, graha.vaaraNe, graha.vaaraEn)}
            </span>
            <span className={cn(sh.pill, "inline-flex")}>
              <Clock className="h-3.5 w-3.5" /> {bilingualText(lang, graha.shubhSamayaNe, graha.shubhSamayaEn)}
            </span>
            <span className={cn(sh.pill, "inline-flex gap-1.5")}>
              <span className={sh.colorDot} style={{ backgroundColor: graha.colorHex }} />
              {bilingualText(lang, graha.colorNe, graha.colorEn)}
            </span>
          </div>
        </header>

        <div className={cn(sh.detailBody, "space-y-5")}>
          {/* mantra + japa */}
          <div className={sh.mantraBox}>
            <div className={sh.mantraLabel}>{t("kundali.x.shanti_beeja_mantra_heading")}</div>
            <p className={sh.mantraBig}>{graha.beejMantra}</p>
            <p className={sh.japa}>
              {bilingualNode(lang, <>जप संख्या: <span className={sh.japaValue}>{digits(graha.japa)}</span> पटक ({t("kundali.x.shanti_kaliyuga_japa")}: <span className={sh.japaValue}>{digits(graha.japa * 4)}</span> पटक)</>,
                <>Japa count: <span className={sh.japaValue}>{digits(graha.japa)}</span> times ({t("kundali.x.shanti_kaliyuga_japa")}: <span className={sh.japaValue}>{digits(graha.japa * 4)}</span> times)</>,
              )}
            </p>
            <div className={sh.mantraSection}>
              <div className={sh.mantraLabel}>{t("kundali.x.shanti_vedic_mantra_heading")}</div>
              <p className={sh.vedic}>{graha.vedicMantra}</p>
            </div>
            <div className={sh.mantraSection}>
              <div className={sh.mantraLabel}>{t("kundali.x.shanti_tantrik_mantra_heading")}</div>
              <p className={sh.mantraBig}>{graha.tantrikMantra}</p>
            </div>
          </div>

          {/* stotram + yantra */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className={sh.stotramBox}>
              <div className={cn(sh.stotramHead, sh.tileLabel, "flex")}>
                <BookOpenText className="h-4 w-4 text-secondary" /> {t("kundali.x.shanti_stotram_heading")}
              </div>
              <p className={sh.stotram}>{graha.stotram}</p>
            </div>
            <div className={sh.stotramBox}>
              <div className={sh.yantraLabel}>{t("kundali.x.shanti_yantra_heading")}</div>
              <div className="mx-auto grid w-32 grid-cols-3 gap-1">
                {graha.yantraGrid.map((n, i) => (
                  <div
                    key={i}
                    className={cn(sh.yantraCell, sh.yantraText, "flex aspect-square")}
                  >
                    {digits(n)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tiles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile icon={<TreePine className="h-4 w-4" />} label={t("kundali.x.shanti_samidha_heading")} value={bilingualText(lang, graha.samidhaNe, graha.samidhaEn)} />
            <InfoTile icon={<Gem className="h-4 w-4" />} label={t("kundali.x.shanti_gem")} value={bilingualText(lang, graha.gemNe, graha.gemEn)} />
            <InfoTile icon={<Sparkles className="h-4 w-4" />} label={t("kundali.x.shanti_metal")} value={bilingualText(lang, graha.metalNe, graha.metalEn)} />
            <InfoTile icon={<Flame className="h-4 w-4" />} label={t("kundali.x.shanti_deity")} value={bilingualText(lang, graha.adhidevataNe, graha.adhidevataEn)} />
            <InfoTile icon={<UserRound className="h-4 w-4" />} label={t("kundali.x.shanti_pratyadhidevata")} value={bilingualText(lang, graha.pratyadhidevataNe, graha.pratyadhidevataEn)} />
            <InfoTile icon={<Compass className="h-4 w-4" />} label={t("kundali.x.shanti_disha")} value={bilingualText(lang, graha.dishaNe, graha.dishaEn)} />
            <InfoTile icon={<Flower2 className="h-4 w-4" />} label={t("kundali.x.shanti_pooja")} value={bilingualText(lang, graha.poojaNe, graha.poojaEn)} />
          </div>

          {/* gem-wearing method */}
          <p className={cn(sh.noteBox, sh.noteText)}>
            <span className={sh.noteLabel}>{t("kundali.x.shanti_gem_detail_label")}</span>{" "}
            {bilingualText(lang, graha.gemDetailNe, graha.gemDetailEn)}
          </p>

          {/* daan */}
          <div>
            <div className={cn(sh.donationHead, sh.donationTitle, "flex")}>
              <HandCoins className="h-4 w-4 text-secondary" /> {t("kundali.x.shanti_donation_items")}
            </div>
            <div className={cn(sh.donationList, "flex")}>
              {(lang === "en" ? graha.daanEn ?? graha.daan : graha.daan).map((item, idx) => (
                <span key={`${item}-${idx}`} className={cn(sh.donationChip, sh.donationChipText)}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className={cn(sh.noteBox, sh.noteText)}>
            <span className={sh.noteLabel}>{t("kundali.x.shanti_use_label")}</span> {bilingualText(lang, graha.remedyNe, graha.remedyEn)}
          </p>
        </div>
      </section>

      {/* full reference table */}
      <div>
        <h3 className={sh.refTitle}>{t("kundali.x.shanti_reference_table")}</h3>
        <div className={sh.refTable}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>{t("learn.playground.planet")}</TableHead>
                <TableHead className={th}>{t("kundali.day")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_beeja_mantra_column")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_japa_column")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_samidha_column")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_gem")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_metal")}</TableHead>
                <TableHead className={th}>{t("kundali.x.shanti_daan_column")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NAVAGRAHA_SHANTI.map((g) => (
                <TableRow
                  key={g.key}
                  className={cn("cursor-pointer", g.key === selectedKey && "bg-secondary/10 hover:bg-secondary/15")}
                  onClick={() => setSelectedKey(g.key)}
                >
                  <TableCell className="whitespace-nowrap font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <GrahaPlanetIcon graha={g.key as GrahaKey} size={22} />
                      {bilingualText(lang, g.nameNe, g.nameEn)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{bilingualText(lang, g.vaaraNe, g.vaaraEn)}</TableCell>
                  <TableCell className="whitespace-nowrap">{g.beejMantra}</TableCell>
                  <TableCell className="whitespace-nowrap">{digits(g.japa)}</TableCell>
                  <TableCell className="whitespace-nowrap">{bilingualText(lang, g.samidhaNe, g.samidhaEn)}</TableCell>
                  <TableCell className="whitespace-nowrap">{bilingualText(lang, g.gemNe, g.gemEn)}</TableCell>
                  <TableCell className="whitespace-nowrap">{bilingualText(lang, g.metalNe, g.metalEn)}</TableCell>
                  <TableCell className="max-w-56">
                    <span className={kundaliDetailClasses.prose.small}>{bilingualText(lang, Array.isArray(g.daan) ? g.daan.join(", ") : g.daan, Array.isArray(g.daanEn) ? g.daanEn.join(", ") : g.daanEn)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className={sh.refNote}>
          {t("kundali.x.shanti_disclaimer")}
        </p>
      </div>
    </div>
  );
}

export default ShantiVidhiPanel;
