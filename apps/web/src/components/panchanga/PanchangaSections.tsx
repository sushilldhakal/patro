import type { PanchangaDay } from "@/lib/api";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import {
  useBalamSection,
  useDinVisheshSection,
  useFestivalsSection,
  useMuhurtaTimingsSection,
  useNivasShoolSection,
  usePadaSection,
  usePanchakaLagnaSection,
  usePanchangCoreSection,
  usePlanetsPanel,
  useRituSection,
  useSunMoonSamvatSection,
  type AngaValue,
  type DualValue,
  type MuhurtaTiming,
  type NivasSegmentRow,
} from "@vedic-patro/features/panchanga";
import {
  PanchangaFieldCell,
  PanchangaGroupLabel,
  PanchangaLagnaCard,
  PanchangaSection,
  PanchangaTableBody,
  PanchangaTimingCard,
  TimingRange,
  UptoValue,
} from "./PanchangaLayout";
import { panchangaCardGrid, panchangaSectionNote } from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { cn } from "@vedic-patro/domain/utils";
import { NavataraBalamCardGrid } from "./NavataraBalamCardGrid";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";

const sc = panchangaPageClasses.sections;

function AngaCell({ anga }: { anga: AngaValue | null }) {
  if (!anga) return <span>—</span>;
  return (
    <>
      <UptoValue name={anga.name} endTime={anga.endTime} />
      {anga.next ? (
        // The next anga carries its own end time — on a kshaya-tithi day this
        // is where the skipped tithi's ending shows.
        <UptoValue name={anga.next.name} endTime={anga.next.endTime} />
      ) : null}
    </>
  );
}

export function SunMoonSamvatSection({ p }: { p: PanchangaDay }) {
  const s = useSunMoonSamvatSection(p);

  return (
    <PanchangaSection titleKey="sections.sun_moon_samvat">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.sunrise" nowrap>
          <span>🌅</span>
          <span className={sc.mono}>{s.sunrise}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.sunset" nowrap>
          <span>🌇</span>
          <span className={sc.mono}>{s.sunset}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonrise" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} className="size-4 shrink-0" />
          <span className={sc.mono}>{s.moonrise}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonset" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} className="size-4 shrink-0" />
          <span className={sc.mono}>{s.moonset}</span>
        </PanchangaFieldCell>
        {s.belaantar ? (
          <PanchangaFieldCell labelKey="sections.equation_of_time" nowrap>
            <span className={sc.mono}>{s.belaantar}</span>
          </PanchangaFieldCell>
        ) : null}
        {s.deshaantar ? (
          <PanchangaFieldCell labelKey="sections.longitude_correction" nowrap>
            <span className={sc.mono}>{s.deshaantar}</span>
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <span className={sc.strong}>{s.paksha}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.vikram" nowrap>
          <span className={sc.strong}>{s.vikram}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.samvatsara" nowrap>
          <span className={sc.strong}>{s.samvatsara}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shaka" nowrap>
          <span className={sc.strong}>{s.shaka}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.nepal_sambat" nowrap>
          <span className={sc.strong}>{s.nepalSambat}</span>
        </PanchangaFieldCell>
      </PanchangaTableBody>
      {s.note ? <p className={panchangaSectionNote}>{s.note}</p> : null}
    </PanchangaSection>
  );
}

export function PanchangCoreSection({ p }: { p: PanchangaDay }) {
  const s = usePanchangCoreSection(p);

  return (
    <PanchangaSection titleKey="sections.panchang_core">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="tithi">
          <AngaCell anga={s.tithi} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="nakshatra">
          <AngaCell anga={s.nakshatra} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.yoga">
          <AngaCell anga={s.yoga} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.karana">
          <AngaCell anga={s.karana} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.weekday" nowrap>
          {/* The full weekday is wide for a half-width card; the short one on phones. */}
          <span className={cn(sc.strong, "sm:hidden")}>{s.weekdayShort}</span>
          <span className={cn("hidden", sc.strong, "sm:inline")}>{s.weekday}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} className="size-4 shrink-0" />
          <span className={sc.strong}>{s.paksha}</span>
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function RashiSection({ p }: { p: PanchangaDay }) {
  const rows = usePadaSection(p);
  if (!rows) return null;

  return (
    <PanchangaSection titleKey="sections.pada_detail">
      <PanchangaTableBody>
        {rows.map((row) => (
          <PanchangaFieldCell key={row.key} label={row.label} nowrap>
            <span className={sc.mono}>{row.value}</span>
          </PanchangaFieldCell>
        ))}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function BalamSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const balam = useBalamSection(p);
  if (!balam) return null;

  return (
    <PanchangaSection titleKey="sections.balam">
      {balam.blocks.map((block) => (
        <div key={block.kind} className={cn("flex flex-col", sc.balamBlock)}>
          <PanchangaGroupLabel className="px-0 pt-0">{block.label}</PanchangaGroupLabel>
          {block.moonRef ? <p className={sc.moonRef}>{block.moonRef}</p> : null}
          <NavataraBalamCardGrid cards={block.cards} clock={clock} formatName={block.formatName} lang={balam.lang} />
        </div>
      ))}
    </PanchangaSection>
  );
}

export function PanchakaLagnaSection({ p, clock }: { p: PanchangaDay; clock?: string }) {
  const s = usePanchakaLagnaSection(p, clock);
  if (!s) return null;

  return (
    <PanchangaSection titleKey="sections.panchaka_lagna">
      <PanchangaTableBody>
        {s.panchaka.length > 0 ? (
          <>
            <PanchangaGroupLabel>{s.copy.panchaka}</PanchangaGroupLabel>
            {s.panchaka.map((pr) => (
              <PanchangaTimingCard key={pr.key} label={pr.label} time={pr.time} highlight={pr.good} />
            ))}
          </>
        ) : null}
        {s.lagna.length > 0 ? (
          <>
            <PanchangaGroupLabel className={s.panchaka.length > 0 ? "pt-3" : undefined}>
              {s.copy.lagna}
            </PanchangaGroupLabel>
            <div className={panchangaCardGrid}>
              {s.lagna.map((lg) => (
                <PanchangaLagnaCard
                  key={lg.key}
                  isCurrent={lg.isCurrent}
                  titleLine={
                    <>
                      {lg.rashi}
                      {lg.time ? (
                        <>
                          {" "}
                          <span className={sc.monoTabular}>{lg.time}</span>
                        </>
                      ) : null}
                    </>
                  }
                  footerLine={
                    lg.pushkara ? (
                      <>
                        {s.copy.pushkara} <span className={sc.monoPlain}>{lg.pushkara}</span>
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function DualValueDisplay({ value }: { value: DualValue | null }) {
  if (!value) return <span>—</span>;
  return (
    <div className={cn("flex flex-col", sc.dual)}>
      {value.struck ? <span className={sc.strike}>{value.struck}</span> : null}
      <span className={sc.strong}>{value.value}</span>
    </div>
  );
}

export function RituSection({ p }: { p: PanchangaDay }) {
  const s = useRituSection(p);

  return (
    <PanchangaSection titleKey="sections.ritu_ayana">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="sections.ritu">
          <DualValueDisplay value={s.ritu} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ayana">
          <DualValueDisplay value={s.ayana} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.dinamana" nowrap>
          <span className={sc.mono}>{s.dinamana}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ratrimana" nowrap>
          <span className={sc.mono}>{s.ratrimana}</span>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.madhyahna" nowrap>
          <span className={sc.mono}>{s.madhyahna}</span>
        </PanchangaFieldCell>
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function MuhurtaTimingValue({ timing, variant }: { timing: MuhurtaTiming; variant: "good" | "bad" }) {
  if (timing.range) {
    return <TimingRange start={timing.range.start} end={timing.range.end} variant={variant} />;
  }
  return (
    <div className={cn("flex flex-col", variant === "good" ? sc.timingGood : sc.timingBad)}>
      {timing.lines.map((line) => (
        <span key={line} className={sc.timingLine}>
          {line}
        </span>
      ))}
    </div>
  );
}

function MuhurtaRows({ rows, variant }: { rows: MuhurtaTiming[]; variant: "good" | "bad" }) {
  return (
    <>
      {rows.map((row) => (
        <PanchangaFieldCell key={row.label} label={row.label}>
          <MuhurtaTimingValue timing={row} variant={variant} />
        </PanchangaFieldCell>
      ))}
    </>
  );
}

export function MuhurtaTimingsSection({ p }: { p: PanchangaDay }) {
  const s = useMuhurtaTimingsSection(p);
  if (!s) return null;

  if (s.combined) {
    return (
      <PanchangaSection titleKey="sections.muhurta_timings">
        <PanchangaTableBody>
          <PanchangaGroupLabel>{s.copy.good}</PanchangaGroupLabel>
          <MuhurtaRows rows={s.good} variant="good" />
          <PanchangaGroupLabel className="pt-3">{s.copy.bad}</PanchangaGroupLabel>
          <MuhurtaRows rows={s.bad} variant="bad" />
        </PanchangaTableBody>
      </PanchangaSection>
    );
  }

  return (
    <>
      {s.good.length > 0 && (
        <PanchangaSection titleKey="sections.auspicious_timings">
          <PanchangaTableBody>
            <MuhurtaRows rows={s.good} variant="good" />
          </PanchangaTableBody>
        </PanchangaSection>
      )}
      {s.bad.length > 0 && (
        <PanchangaSection titleKey="sections.inauspicious_timings">
          <PanchangaTableBody>
            <MuhurtaRows rows={s.bad} variant="bad" />
          </PanchangaTableBody>
        </PanchangaSection>
      )}
    </>
  );
}

function NivasTimedSegments({ segments }: { segments: NivasSegmentRow[] }) {
  if (!segments.length) return <span>—</span>;
  return (
    <div className={cn("flex flex-col", sc.nivasList)}>
      {segments.map((seg) => (
        <div key={seg.key} className={sc.nivasItem}>
          {seg.fromNight ? (
            <span className={sc.strong}>
              {seg.name} <span className={sc.nivasTime}>{seg.fromNight}</span>
            </span>
          ) : (
            <UptoValue name={seg.name} endTime={seg.endTime} badge={seg.badge} />
          )}
          {seg.fullNightNote ? <span className={sc.nivasTime}>{seg.fullNightNote}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function NivasShoolSection({
  p,
  fallback,
}: {
  p: PanchangaDay;
  fallback?: PanchangaDay | null;
}) {
  const rows = useNivasShoolSection(p, fallback);
  if (!rows) return null;

  return (
    <PanchangaSection titleKey="sections.nivas_shool">
      <PanchangaTableBody>
        {rows.map((row) => (
          <PanchangaFieldCell key={row.key} labelKey={row.labelKey} nowrap={row.nowrap}>
            {row.kind === "direction" ? (
              row.value ? <span className={sc.strong}>{row.value}</span> : <span>—</span>
            ) : (
              <NivasTimedSegments segments={row.segments} />
            )}
          </PanchangaFieldCell>
        ))}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

export function DinVisheshSection({ p }: { p: PanchangaDay }) {
  const labels = useDinVisheshSection(p);
  if (!labels.length) return null;

  return (
    <PanchangaSection titleKey="sections.special_observances">
      <div className={panchangaCardGrid}>
        {labels.map((label) => (
          <span key={label} className={sc.chipFestival}>
            {label}
          </span>
        ))}
      </div>
    </PanchangaSection>
  );
}

export function PlanetsPanel({ p }: { p: PanchangaDay }) {
  const panel = usePlanetsPanel(p);
  if (!panel) return null;

  return (
    <div
      className={cn(
        sc.planetsPanel,
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
      )}
    >
      <div className={cn("flex flex-col", sc.planetsHead)}>
        <h2 className={sc.planetsTitle}>{panel.title}</h2>
        <span className={cn(sc.planetsAnchor, "break-words [overflow-wrap:anywhere]")}>{panel.anchor}</span>
      </div>
      <div className={cn("flex", sc.planetsList)}>
        {panel.lagna && (
          <div className={cn("flex", sc.lagnaRow)}>
            <span
              className={cn(
                "flex",
                sc.lagnaBadge,
                "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
              )}
            >
              {panel.lagna.badge}
            </span>
            <div className={sc.lagnaBody}>
              <div className={sc.lagnaTitle}>{panel.lagna.title}</div>
              <div className={sc.lagnaSign}>{panel.lagna.sign}</div>
            </div>
            {panel.lagna.degree && (
              <span className={cn(sc.planetCoords, "break-all [overflow-wrap:anywhere]")}>{panel.lagna.degree}</span>
            )}
          </div>
        )}
        {panel.planets.map((planet) => (
          <div key={planet.key} className={cn("flex", sc.planetRow)}>
            <div className={sc.planetBody}>
              <div className={cn("flex", sc.planetNameRow, sc.planetName, "break-words")}>
                {planet.name}
                <GrahaStatusBadges planetKey={planet.key} isRetrograde={planet.isRetrograde} isCombust={planet.isCombust} />
              </div>
              {planet.rashi && <div className={cn(sc.planetRashi, "break-words")}>{planet.rashi}</div>}
            </div>
            <span className={cn(sc.planetCoords, "break-all [overflow-wrap:anywhere]")}>{planet.coords}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FestivalsSection({ p }: { p: PanchangaDay }) {
  const festivals = useFestivalsSection(p);
  if (!festivals.length) return null;

  return (
    <PanchangaSection titleKey="sections.festivals">
      <div className={panchangaCardGrid}>
        {festivals.map((f) => (
          <span key={f.id} className={f.holiday ? sc.chipHoliday : sc.chipFestival}>
            {f.name}
          </span>
        ))}
      </div>
    </PanchangaSection>
  );
}
