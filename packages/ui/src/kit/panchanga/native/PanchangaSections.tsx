import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Text } from "@vedic-patro/ui";
import { DURATION, EASE_OUT } from "@vedic-patro/ui/motion";
import type { PanchangaDay } from "@vedic-patro/api-client";
import {
  useBalamSection,
  useDinVisheshSection,
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
  panchangaCardGrid,
  panchangaSectionNote,
} from "./PanchangaLayout";
import { CalendarMoonPhaseIcon } from "./CalendarMoonPhaseIcon";
import { NavataraBalamCardGrid } from "@vedic-patro/ui/kit/panchanga";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";
import { GrahaStatusBadges } from "./GrahaStatusBadges";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

const sc = panchangaPageClasses.sections;

function Crossfade({ token, children }: { token: string; children: ReactNode }) {
  const opacity = useSharedValue(1);
  const latest = useRef(children);
  const [fade, setFade] = useState<{ token: string; prev: ReactNode | null; gen: number; reset: boolean }>({
    token,
    prev: null,
    gen: 0,
    reset: false,
  });
  if (token !== fade.token) {
    setFade({
      token,
      prev: fade.prev ?? latest.current,
      gen: fade.gen + 1,
      reset: fade.prev == null,
    });
  }
  latest.current = children;

  useLayoutEffect(() => {
    if (!fade.prev) return;
    if (fade.reset) opacity.set(0);
    opacity.set(withTiming(1, { duration: DURATION.fast, easing: EASE_OUT }));
    const gen = fade.gen;
    const timer = setTimeout(() => {
      setFade((current) => (current.gen === gen ? { ...current, prev: null, reset: false } : current));
    }, DURATION.fast + 20);
    return () => clearTimeout(timer);
  }, [fade.gen, fade.prev, fade.reset, opacity]);

  const incoming = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const outgoing = useAnimatedStyle(() => ({ opacity: 1 - opacity.get() }));
  if (!fade.prev) return children;
  return (
    <View style={{ position: "relative" }}>
      <Animated.View pointerEvents="none" style={[outgoing, { position: "absolute", left: 0, right: 0, top: 0 }]}>
        {fade.prev}
      </Animated.View>
      <Animated.View style={incoming}>{children}</Animated.View>
    </View>
  );
}

function angaToken(anga: AngaValue | null): string {
  if (!anga) return "";
  return `${anga.name}|${anga.endTime ?? ""}|${anga.next?.name ?? ""}|${anga.next?.endTime ?? ""}`;
}

function AngaCell({ anga }: { anga: AngaValue | null }) {
  if (!anga) return <Text>—</Text>;
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
          <Text>🌅</Text>
          <Text className={sc.mono}>{s.sunrise}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.sunset" nowrap>
          <Text>🌇</Text>
          <Text className={sc.mono}>{s.sunset}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonrise" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} size={16} />
          <Text className={sc.mono}>{s.moonrise}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.moonset" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} size={16} />
          <Text className={sc.mono}>{s.moonset}</Text>
        </PanchangaFieldCell>
        {s.belaantar ? (
          <PanchangaFieldCell labelKey="sections.equation_of_time" nowrap>
            <Text className={sc.mono}>{s.belaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        {s.deshaantar ? (
          <PanchangaFieldCell labelKey="sections.longitude_correction" nowrap>
            <Text className={sc.mono}>{s.deshaantar}</Text>
          </PanchangaFieldCell>
        ) : null}
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <Text className={sc.strong}>{s.paksha}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.vikram" nowrap>
          <Text className={sc.strong}>{s.vikram}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.samvatsara" nowrap>
          <Text className={sc.strong}>{s.samvatsara}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.shaka" nowrap>
          <Text className={sc.strong}>{s.shaka}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.nepal_sambat" nowrap>
          <Text className={sc.strong}>{s.nepalSambat}</Text>
        </PanchangaFieldCell>
      </PanchangaTableBody>
      {s.note ? <Text className={panchangaSectionNote}>{s.note}</Text> : null}
    </PanchangaSection>
  );
}

export function PanchangCoreSection({ p }: { p: PanchangaDay }) {
  const s = usePanchangCoreSection(p);

  return (
    <PanchangaSection titleKey="sections.panchang_core">
      <PanchangaTableBody>
        <PanchangaFieldCell labelKey="tithi">
          <Crossfade token={angaToken(s.tithi)}>
            <AngaCell anga={s.tithi} />
          </Crossfade>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="nakshatra">
          <Crossfade token={angaToken(s.nakshatra)}>
            <AngaCell anga={s.nakshatra} />
          </Crossfade>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.yoga">
          <Crossfade token={angaToken(s.yoga)}>
            <AngaCell anga={s.yoga} />
          </Crossfade>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.karana">
          <AngaCell anga={s.karana} />
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.weekday" nowrap>
          <Text className={sc.strong}>{s.weekday}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.paksha" nowrap>
          <CalendarMoonPhaseIcon tithiIndex={s.tithiIndex} size={16} />
          <Text className={sc.strong}>{s.paksha}</Text>
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
            <Text className={sc.mono}>{row.value}</Text>
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
        <View key={block.kind} className={cn("flex flex-col", sc.balamBlock)}>
          <PanchangaGroupLabel className="px-0 pt-0">{block.label}</PanchangaGroupLabel>
          {block.moonRef ? <Text className={sc.moonRef}>{block.moonRef}</Text> : null}
          <NavataraBalamCardGrid
            cards={block.cards}
            clock={clock}
            formatName={block.formatName}
            lang={balam.lang}
            variant={block.kind}
          />
        </View>
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
            <View className={panchangaCardGrid}>
              {s.lagna.map((lg) => (
                <PanchangaLagnaCard
                  key={lg.key}
                  isCurrent={lg.isCurrent}
                  titleLine={
                    <Text>
                      {lg.rashi}
                      {lg.time ? <Text className={sc.monoTabular}> {lg.time}</Text> : null}
                    </Text>
                  }
                  footerLine={
                    lg.pushkara ? (
                      <Text>
                        {s.copy.pushkara} <Text className={sc.monoPlain}>{lg.pushkara}</Text>
                      </Text>
                    ) : undefined
                  }
                />
              ))}
            </View>
          </>
        ) : null}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

function DualValueDisplay({ value }: { value: DualValue | null }) {
  if (!value) return <Text>—</Text>;
  return (
    <View className={cn("flex flex-col", sc.dual)}>
      {value.struck ? <Text className={sc.strike}>{value.struck}</Text> : null}
      <Text className={sc.strong}>{value.value}</Text>
    </View>
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
          <Text className={sc.mono}>{s.dinamana}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.ratrimana" nowrap>
          <Text className={sc.mono}>{s.ratrimana}</Text>
        </PanchangaFieldCell>
        <PanchangaFieldCell labelKey="sections.madhyahna" nowrap>
          <Text className={sc.mono}>{s.madhyahna}</Text>
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
    <View className={cn("flex flex-col", variant === "good" ? sc.timingGood : sc.timingBad)}>
      {timing.lines.map((line) => (
        <Text
          key={line}
          className={cn(
            sc.timingLine,
            variant === "good" ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300",
          )}
        >
          {line}
        </Text>
      ))}
    </View>
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
  if (!segments.length) return <Text>—</Text>;
  return (
    <View className={cn("flex flex-col", sc.nivasList)}>
      {segments.map((seg) => (
        <View key={seg.key} className={sc.nivasItem}>
          {seg.fromNight ? (
            <Text className={sc.strong}>
              {seg.name} <Text className={sc.nivasTime}>{seg.fromNight}</Text>
            </Text>
          ) : (
            <UptoValue name={seg.name} endTime={seg.endTime} badge={seg.badge} />
          )}
          {seg.fullNightNote ? <Text className={sc.nivasTime}>{seg.fullNightNote}</Text> : null}
        </View>
      ))}
    </View>
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
              row.value ? <Text className={sc.strong}>{row.value}</Text> : <Text>—</Text>
            ) : (
              <NivasTimedSegments segments={row.segments} />
            )}
          </PanchangaFieldCell>
        ))}
      </PanchangaTableBody>
    </PanchangaSection>
  );
}

type DinVishesh = ReturnType<typeof useDinVisheshSection>;

function SaitBlock({ row }: { row: NonNullable<DinVishesh["festivals"][number]["sait"]> }) {
  return (
    <View className={sc.festivalSait}>
      <Text className={sc.festivalSaitLabel}>{row.label}</Text>
      {row.times.map((slot) => (
        <View key={slot.key} className={sc.festivalSaitRow}>
          <Text className={sc.festivalSaitTime}>{slot.time}</Text>
          {slot.detail ? <Text className={sc.festivalSaitDetail}>{slot.detail}</Text> : null}
        </View>
      ))}
      {row.facing ? <Text className={sc.festivalSaitFacing}>{row.facing}</Text> : null}
    </View>
  );
}

/** दिन विशेष: one card per festival (what, when, how, sait), then the day's other markers. */
export function DinVisheshSection({ p }: { p: PanchangaDay }) {
  const day = useDinVisheshSection(p);
  if (day.empty) return null;

  return (
    <PanchangaSection titleKey="sections.special_observances">
      <View className={sc.festivalList}>
        {day.festivals.map((f) => (
          <View key={f.id} className={sc.festivalCard}>
            <View className={sc.festivalHead}>
              <Text className={sc.festivalName}>{f.name}</Text>
              {f.holiday ? <Text className={sc.festivalBadge}>{day.copy.holiday}</Text> : null}
            </View>
            {f.when ? <Text className={sc.festivalWhen}>{f.when}</Text> : null}
            {f.about ? <Text className={sc.festivalAbout}>{f.about}</Text> : null}
            {f.sait ? <SaitBlock row={f.sait} /> : null}
            {f.steps.length ? (
              <View className={sc.festivalSteps}>
                <Text className={sc.festivalSubheading}>{day.copy.vidhi}</Text>
                {f.steps.map((step) => (
                  <View key={step.key} className={sc.festivalStep}>
                    <Text className={sc.festivalStepNumber}>{step.number}</Text>
                    <Text className={sc.festivalStepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {day.ceremonies.length ? (
          <View className={sc.festivalCard}>
            <Text className={sc.festivalName}>{day.copy.ceremonies}</Text>
            {day.ceremonies.map((row) => (
              <SaitBlock key={row.key} row={row} />
            ))}
          </View>
        ) : null}
        {day.copy.note ? <Text className={sc.festivalNote}>{day.copy.note}</Text> : null}
        {day.markers.length ? (
          <View className={sc.festivalMarkers}>
            {day.markers.map((label) => (
              <Text key={label} className={sc.chipFestival}>
                {label}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </PanchangaSection>
  );
}

export function PlanetsPanel({ p }: { p: PanchangaDay }) {
  const panel = usePlanetsPanel(p);
  if (!panel) return null;

  return (
    <View className={sc.planetsPanel}>
      <View className={cn("flex flex-col", sc.planetsHead)}>
        <Text className={sc.planetsTitle}>{panel.title}</Text>
        <Text className={sc.planetsAnchor}>{panel.anchor}</Text>
      </View>
      <View className={cn("flex", sc.planetsList)}>
        {panel.lagna && (
          <View className={cn("flex", sc.lagnaRow)}>
            <Text className={cn("flex", sc.lagnaBadge)}>{panel.lagna.badge}</Text>
            <View className={sc.lagnaBody}>
              <Text className={sc.lagnaTitle}>{panel.lagna.title}</Text>
              <Text className={sc.lagnaSign}>{panel.lagna.sign}</Text>
            </View>
            {panel.lagna.degree && <Text className={sc.planetCoords}>{panel.lagna.degree}</Text>}
          </View>
        )}
        {panel.planets.map((planet) => (
          <View key={planet.key} className={cn("flex", sc.planetRow)}>
            <GrahaPlanetIcon graha={planet.key as GrahaKey} size={32} />
            <View className={sc.planetBody}>
              <View className={sc.planetNameRow}>
                <Text className={sc.planetName}>{planet.name}</Text>
                <GrahaStatusBadges planetKey={planet.key} isRetrograde={planet.isRetrograde} isCombust={planet.isCombust} />
              </View>
              {planet.rashi ? <Text className={sc.planetRashi}>{planet.rashi}</Text> : null}
            </View>
            <Text className={sc.nivasTime}>{planet.coords}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
