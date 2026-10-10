import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { cn } from "@/lib/utils";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@/lib/api";
import { NAVAGRAHA_SHANTI, getGrahaShanti } from "@/lib/shanti/navagraha-shanti";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@/lib/graha-details";

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
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card/40 p-3">
      <div className="mt-0.5 text-secondary">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm text-base uppercase tracking-wide">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

const REMEDY_BADGE_CLASS: Record<GrahaShantiFinding["remedy"], string> = {
  shanti: "border-secondary bg-secondary/10 text-secondary",
  strengthen: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pacify: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  pacify_transit: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  soothe: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
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
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-base uppercase tracking-wide">
          {bilingualText(lang, finding.stepTitleNe, finding.stepTitleEn)}
        </span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            REMEDY_BADGE_CLASS[finding.remedy],
          )}
        >
          {t(`kundali.x.shanti_remedy_${finding.remedy}`)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <GrahaPlanetIcon graha={finding.graha as GrahaKey} size={28} />
        <span className="text-lg font-bold text-foreground">{bilingualText(lang, nameNe, nameEn)}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, finding.reasonNe, finding.reasonEn)}</p>
      <button
        type="button"
        onClick={() => onSelect(finding.graha)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-secondary/10 px-3 py-1.5 text-sm text-base text-secondary transition-colors hover:bg-secondary/20"
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/30 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
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
    <div className="space-y-4">
      {/* recommendations from this chart — server-computed 4-step decision */}
      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
        <div className="rounded-lg border border-border bg-card/30 p-3 text-sm">
          {t("kundali.x.shanti_findings_empty")}
        </div>
      )}
      <p className="text-sm leading-relaxed">
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
                "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                active
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border bg-card/30 text-foreground hover:bg-muted",
              )}
            >
              <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
              <span className="text-xs font-semibold">{bilingualText(lang, g.nameNe, g.nameEn)}</span>
            </button>
          );
        })}
      </div>

      {/* selected graha detail */}
      <section ref={detailRef} className="scroll-mt-20 overflow-hidden rounded-2xl border border-border">
        <header
          className="flex flex-wrap items-center gap-3 border-b border-border p-5"
          style={{ background: `linear-gradient(90deg, ${graha.colorHex}1f, transparent)` }}
        >
          <span
            className="flex w-1.5 self-stretch rounded-full shadow"
            style={{ backgroundColor: graha.colorHex }}
            aria-hidden
          />
          <GrahaPlanetIcon graha={graha.key as GrahaKey} size={40} className="shrink-0" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{bilingualText(lang, `${graha.nameNe} शान्ति`, `${graha.nameEn} Shanti`)}</h2>
            <p className="text-xs">{bilingualText(lang, graha.nameEn, graha.nameNe)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
              <CalendarDays className="h-3.5 w-3.5" /> {bilingualText(lang, graha.vaaraNe, graha.vaaraEn)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" /> {bilingualText(lang, graha.shubhSamayaNe, graha.shubhSamayaEn)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: graha.colorHex }} />
              {bilingualText(lang, graha.colorNe, graha.colorEn)}
            </span>
          </div>
        </header>

        <div className="space-y-5 p-5">
          {/* mantra + japa */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-1 text-sm text-base uppercase tracking-wide">{t("kundali.x.shanti_beeja_mantra_heading")}</div>
            <p className="text-lg font-semibold leading-relaxed text-foreground">{graha.beejMantra}</p>
            <p className="mt-1.5 text-sm">
              {bilingualNode(lang, <>जप संख्या: <span className="font-semibold text-foreground">{digits(graha.japa)}</span> पटक ({t("kundali.x.shanti_kaliyuga_japa")}: <span className="font-semibold text-foreground">{digits(graha.japa * 4)}</span> पटक)</>,
                <>Japa count: <span className="font-semibold text-foreground">{digits(graha.japa)}</span> times ({t("kundali.x.shanti_kaliyuga_japa")}: <span className="font-semibold text-foreground">{digits(graha.japa * 4)}</span> times)</>,
              )}
            </p>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1 text-sm text-base uppercase tracking-wide">{t("kundali.x.shanti_vedic_mantra_heading")}</div>
              <p className="text-sm leading-relaxed text-foreground">{graha.vedicMantra}</p>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1 text-sm text-base uppercase tracking-wide">{t("kundali.x.shanti_tantrik_mantra_heading")}</div>
              <p className="text-lg font-semibold leading-relaxed text-foreground">{graha.tantrikMantra}</p>
            </div>
          </div>

          {/* stotram + yantra */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-border bg-card/30 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm text-base uppercase tracking-wide">
                <BookOpenText className="h-4 w-4 text-secondary" /> {t("kundali.x.shanti_stotram_heading")}
              </div>
              <p className="text-base italic leading-relaxed text-foreground">{graha.stotram}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/30 p-4">
              <div className="mb-2 text-center text-sm text-base uppercase tracking-wide">{t("kundali.x.shanti_yantra_heading")}</div>
              <div className="mx-auto grid w-32 grid-cols-3 gap-1">
                {graha.yantraGrid.map((n, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded border border-border bg-background text-sm font-semibold text-foreground"
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
          <p className="rounded-lg border border-border bg-card/30 p-3 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{t("kundali.x.shanti_gem_detail_label")}</span>{" "}
            {bilingualText(lang, graha.gemDetailNe, graha.gemDetailEn)}
          </p>

          {/* daan */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <HandCoins className="h-4 w-4 text-secondary" /> {t("kundali.x.shanti_donation_items")}
            </div>
            <div className="flex flex-wrap gap-2">
              {(lang === "en" ? graha.daanEn ?? graha.daan : graha.daan).map((item, idx) => (
                <span key={`${item}-${idx}`} className="rounded-full border border-border bg-card/40 px-3 py-1 text-sm text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className="rounded-lg border border-border bg-card/30 p-3 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{t("kundali.x.shanti_use_label")}</span> {bilingualText(lang, graha.remedyNe, graha.remedyEn)}
          </p>
        </div>
      </section>

      {/* full reference table */}
      <div>
        <h3 className="mb-3 text-base font-bold text-foreground">{t("kundali.x.shanti_reference_table")}</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
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
                    <span className="text-xs">{bilingualText(lang, Array.isArray(g.daan) ? g.daan.join(", ") : g.daan, Array.isArray(g.daanEn) ? g.daanEn.join(", ") : g.daanEn)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          {t("kundali.x.shanti_disclaimer")}
        </p>
      </div>
    </div>
  );
}

export default ShantiVidhiPanel;
