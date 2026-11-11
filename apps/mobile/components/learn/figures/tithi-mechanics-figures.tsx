import { useSvgClass } from "@/components/learn/study/study-ink";
import { G, Line, Polygon, Rect, Text as SvgText, TSpan } from "react-native-svg";
import { Fragment } from "react";
import {
  tmAdhikNote,
  tmAdhikRing,
  tmAxis,
  tmBand,
  tmBandName,
  tmBandNo,
  tmDate,
  tmDateSub,
  tmLunarBand,
  tmSegName,
  tmSegSym,
  tmSegTag,
  tmSolarBand,
  tmSunline,
  tmTlCap,
  tmTrackLabel,
  tmTrackSub,
  tmTravel,
  tmTravelHead,
  tmVline,
} from "@vedic-patro/design-tokens/classes/diagram-classes";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { WHEEL_TITHIS, tithiNum } from "@vedic-patro/domain/panchanga/tithi-wheel-data";
import { View } from "react-native";
import Svg from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { STUDY_FONT, useStudyInk } from "@/components/learn/study/study-ink";
import { TmLegendDot, TmNewMoon, TmSun } from "./tm-glyph-figures";
import { tFor } from "@vedic-patro/i18n/runtime";

/** The app's drawing of the website's `tmCal*` / `tmAmLegend` boxes. */
const CAL = {
  gap: "w-24 shrink-0 items-center justify-center gap-1 rounded-xl border border-dashed p-2 opacity-90",
  gapTag: "text-center text-sm font-semibold uppercase tracking-widest",
  cell: "min-w-28 flex-1 rounded-xl border px-3.5 py-3",
  row: "mt-4 flex-row flex-wrap items-stretch gap-2",
  legend: "mt-4 flex-row flex-wrap justify-center gap-5",
} as const;

function tName(band: number) {
  return WHEEL_TITHIS[((band % 30) + 30) % 30]!;
}
function tNo(band: number) {
  return tithiNum(((band % 30) + 30) % 30);
}

export function SunriseTimeline({ mode }: { mode: "vriddhi" | "kshaya" }) {
  const sc = useSvgClass();
  const ink = useStudyInk();
  const fmt = (n: number) => toNepaliDigits(n);
  const W = 1180;
  const H = 250;
  const padL = 56;
  const padR = 56;
  const trackTop = 96;
  const trackH = 64;
  const isVri = mode === "vriddhi";
  const rate = isVri ? 10.7 : 14.3;
  const startE = isVri ? 24 : 25;
  const nDays = 6;
  const startGate = 10;

  const sun = Array.from({ length: nDays }, (_, i) => startE + rate * i);
  const Emin = Math.floor(sun[0]! / 12) * 12 - 6;
  const Emax = Math.ceil(sun[nDays - 1]! / 12) * 12 + 6;
  const mapE = (E: number) => padL + ((E - Emin) / (Emax - Emin)) * (W - padL - padR);

  const sunBand = sun.map((e) => Math.floor(e / 12));
  const b0 = Math.floor(Emin / 12);
  const b1 = Math.ceil(Emax / 12);

  let dupBand: number | null = null;
  let skipBand: number | null = null;
  if (isVri) {
    for (let i = 1; i < nDays; i++) {
      if (sunBand[i] === sunBand[i - 1]) dupBand = sunBand[i]!;
    }
  } else {
    for (let i = 1; i < nDays; i++) {
      if (sunBand[i]! - sunBand[i - 1]! >= 2) skipBand = sunBand[i - 1]! + 1;
    }
  }

  const bands = [];
  for (let b = b0; b < b1; b++) {
    const x0 = mapE(b * 12);
    const x1 = mapE(b * 12 + 12);
    const isDup = b === dupBand;
    const isSkip = b === skipBand;
    bands.push(
      <G key={`b${b}`}>
        <Rect
          x={x0}
          y={trackTop}
          width={x1 - x0}
          height={trackH}
          {...sc(tmBand({ alt: b % 2 === 1, dup: isDup, skip: isSkip }))}
        />
        <SvgText
          x={(x0 + x1) / 2}
          y={trackTop + 25}
          {...sc(tmBandNo(isDup || isSkip))}
          textAnchor="middle"
        >
          {fmt(tNo(b))}
        </SvgText>
        <SvgText
          x={(x0 + x1) / 2}
          y={trackTop + 45}
          {...sc(tmBandName(isDup || isSkip))}
          textAnchor="middle"
        >
          {tName(b).ne}
        </SvgText>
      </G>
    );
  }

  const marks = sun.map((e, i) => {
    const x = mapE(e);
    return (
      <G key={`s${i}`}>
        <Line x1={x} y1={trackTop - 22} x2={x} y2={trackTop + trackH + 10} {...sc(tmSunline)} />
        <TmSun x={x} y={trackTop - 34} r={10} />
        <SvgText x={x} y={trackTop + trackH + 30} {...sc(tmDate)} textAnchor="middle">
          {fmt(startGate + i)}{tFor(undefined, "dainik.text")}
        </SvgText>
        <SvgText x={x} y={trackTop + trackH + 46} {...sc(tmDateSub)} textAnchor="middle">
          {tFor(undefined, "panchanga.wheel.sunrise")}
        </SvgText>
      </G>
    );
  });

  const cal = sun.map((_, i) => ({ gate: startGate + i, band: sunBand[i]! }));

  return (
    <View className="my-4 w-full">
      <TmSvg w={W} h={H}>
        <Line
          x1={padL - 6}
          y1={trackTop + trackH / 2}
          x2={W - padR + 6}
          y2={trackTop + trackH / 2}
          {...sc(tmAxis)}
        />
        {bands}
        {marks}
        <SvgText x={padL - 2} y={36} {...sc(tmTlCap)}>
          {tFor(undefined, "ui.tithi_mechanics.x_0b057b2f")}{fmt(rate)}{tFor(undefined, "ui.tithi_mechanics.x_6a013502")}{isVri ? tFor(undefined, "ui.tithi_mechanics.x_dd1238ac") : tFor(undefined, "ui.tithi_mechanics.x_d3495442")})
        </SvgText>
        <Line x1={padL} y1={52} x2={W - padR} y2={52} {...sc(tmTravel)} />
        <Polygon
          points={`${W - padR},52 ${W - padR - 11},47 ${W - padR - 11},57`}
          {...sc(tmTravelHead)}
        />
      </TmSvg>

      <View className={CAL.row}>
        {cal.map((c, i) => {
          const prevSame = i > 0 && cal[i - 1]!.band === c.band;
          const jump = i > 0 && c.band - cal[i - 1]!.band >= 2;
          const dup = prevSame || (isVri && i < nDays - 1 && cal[i + 1]?.band === c.band);
          return (
            <Fragment key={i}>
              {jump && skipBand != null && (
                <View className={CAL.gap} style={{ borderColor: ink.amber }}>
                  <Text className="text-center text-sm font-semibold" style={[nepaliTextStyle(14), { color: ink.amber }]}>
                    {fmt(tNo(skipBand))} {tName(skipBand).ne}
                  </Text>
                  <Text className={CAL.gapTag} style={[nepaliTextStyle(14), { color: ink.faint }]}>
                    {tFor(undefined, "ui.tithi_mechanics.x_3ff78e11")}
                  </Text>
                </View>
              )}
              <View
                className={CAL.cell}
                style={dup ? { borderColor: ink.amber, backgroundColor: ink.mix(ink.amber, 16) } : { borderColor: ink.border, backgroundColor: ink.mix(ink.teal, 8) }}
              >
                <Text className="text-xs font-semibold" style={[nepaliTextStyle(12), { color: ink.faint }]}>
                  {fmt(c.gate)}{tFor(undefined, "dainik.text")}
                </Text>
                <Text className="mt-0.5 text-lg font-bold" style={[nepaliTextStyle(18), { color: ink.ink }]}>
                  {tName(c.band).ne}
                </Text>
                <Text className="mt-0.5 text-base" style={[nepaliTextStyle(16), { color: ink.dim }]}>
                  {tName(c.band).paksha.split(" ")[0]} {fmt(tNo(c.band))}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

export function AdhikMassDiagram() {
  const sc = useSvgClass();
  const ink = useStudyInk();
  const W = 1180;
  const H = 348;
  const padL = 40;
  const padR = 40;
  const SOLAR = 30.44;
  const SYN = 29.53;
  const days = 95;
  const x = (d: number) => padL + (d / days) * (W - padL - padR);

  const sankr = [0, SOLAR, SOLAR * 2, SOLAR * 3];
  const rashi = getRashiList("ne").slice(0, 3);
  const rashiSym = ["", "", ""];
  const amav = [0.6, 0.6 + SYN, 0.6 + SYN * 2, 0.6 + SYN * 3];

  const solarY = 78;
  const lunarY = 214;
  const bandH = 54;

  let adhik = -1;
  for (let i = 0; i < amav.length - 1; i++) {
    const inside = sankr.some((s) => s > amav[i]! + 0.01 && s < amav[i + 1]! - 0.01);
    if (!inside) {
      adhik = i;
      break;
    }
  }

  const lunarName = [tFor("ne", "ui.tithi_mechanics.x_f6a94d89"), tFor("ne", "ui.tithi_mechanics.x_a6766ae7"), tFor("ne", "learn.ashadh")];
  const labelFor = (i: number) => {
    if (i < adhik) return { ne: lunarName[i]!, tag: tFor(undefined, "ui.tithi_mechanics.x_80a6b6b6") };
    if (i === adhik) return { ne: tFor("ne", "ui.learn.adhik") + lunarName[i], tag: tFor(undefined, "ui.tithi_mechanics.x_b82964bb") };
    return { ne: lunarName[i - 1] || tFor("ne", "learn.ashadh"), tag: tFor(undefined, "ui.tithi_mechanics.x_80a6b6b6") };
  };

  const solarSegs = [];
  for (let i = 0; i < sankr.length - 1; i++) {
    const x0 = x(sankr[i]!);
    const x1 = x(sankr[i + 1]!);
    solarSegs.push(
      <G key={`sol${i}`}>
        <Rect x={x0} y={solarY} width={x1 - x0} height={bandH} {...sc(tmSolarBand)} rx={6} />
        <SvgText x={(x0 + x1) / 2} y={solarY + 22} {...sc(tmSegSym)} textAnchor="middle">
          {rashiSym[i]}
        </SvgText>
        <SvgText x={(x0 + x1) / 2} y={solarY + 40} {...sc(tmSegName())} textAnchor="middle">
          {rashi[i]}{tFor(undefined, "ui.tithi_mechanics.x_af2b54e2")}
        </SvgText>
      </G>
    );
  }

  const lunarSegs = [];
  for (let i = 0; i < amav.length - 1; i++) {
    const x0 = x(amav[i]!);
    const x1 = x(amav[i + 1]!);
    const isAdhik = i === adhik;
    const lbl = labelFor(i);
    lunarSegs.push(
      <G key={`lun${i}`}>
        <Rect
          x={x0}
          y={lunarY}
          width={x1 - x0}
          height={bandH}
          {...sc(tmLunarBand(isAdhik))}
          rx={6}
        />
        <SvgText
          x={(x0 + x1) / 2}
          y={lunarY + 21}
          {...sc(tmSegName(isAdhik))}
          textAnchor="middle"
        >
          {lbl.ne}
        </SvgText>
        <SvgText
          x={(x0 + x1) / 2}
          y={lunarY + 39}
          {...sc(tmSegTag(isAdhik))}
          textAnchor="middle"
        >
          {isAdhik ? tFor(undefined, "ui.tithi_mechanics.x_c37746af") : tFor(undefined, "learn.diagrams.hierarchy_step_lunar_month")}
        </SvgText>
      </G>
    );
  }

  const sankrMarks = sankr.map((d, i) => (
    <G key={`sk${i}`}>
      <Line x1={x(d)} y1={solarY - 24} x2={x(d)} y2={lunarY + bandH + 10} {...sc(tmVline)} />
      <TmSun x={x(d)} y={solarY - 34} r={10} />
    </G>
  ));
  const amavMarks = amav.map((d, i) => (
    <G key={`am${i}`}>
      <TmNewMoon x={x(d)} y={lunarY + bandH + 26} r={9} />
    </G>
  ));

  let callout = null;
  if (adhik >= 0) {
    const cx0 = x(amav[adhik]!);
    const cx1 = x(amav[adhik + 1]!);
    callout = (
      <G>
        <SvgText x={(cx0 + cx1) / 2} y={lunarY - 12} {...sc(tmAdhikNote)} textAnchor="middle">
          {tFor(undefined, "ui.learn.adhik_month")}
        </SvgText>
        <Rect
          x={cx0}
          y={lunarY - 4}
          width={cx1 - cx0}
          height={bandH + 8}
          {...sc(tmAdhikRing)}
          rx={8}
        />
      </G>
    );
  }

  return (
    <View className="my-4 w-full">
      <TmSvg w={W} h={H}>
        <SvgText x={padL} y={34} {...sc(tmTrackLabel)}>
          {tFor(undefined, "ui.tithi_mechanics.x_32ec504d")}{" "}
          <TSpan {...sc(tmTrackSub)}>{tFor(undefined, "ui.tithi_mechanics.x_6134bad2")}</TSpan>
        </SvgText>
        {solarSegs}
        {sankrMarks}
        {callout}
        {lunarSegs}
        {amavMarks}
        <SvgText x={padL} y={lunarY + bandH + 56} {...sc(tmTrackLabel)}>
          {tFor(undefined, "learn.diagrams.hierarchy_step_lunar_month")}{" "}
          <TSpan {...sc(tmTrackSub)}>{tFor(undefined, "ui.tithi_mechanics.x_734e679e")}</TSpan>
        </SvgText>
      </TmSvg>
      <View className={CAL.legend}>
        <LegendItem mark={<TmLegendDot kind="sun" />} label={tFor(undefined, "ui.tithi_mechanics.x_a2e095ec")} />
        <LegendItem mark={<TmLegendDot kind="moon" />} label={tFor(undefined, "ui.tithi_mechanics.x_11561c52")} />
        <LegendItem
          mark={<View className="h-4 w-4 rounded" style={{ borderWidth: 1.6, borderColor: ink.amber, backgroundColor: ink.mix(ink.amber, 28) }} />}
          label={tFor(undefined, "ui.tithi_mechanics.x_2ca8db9e")}
        />
      </View>
    </View>
  );
}

function LegendItem({ mark, label }: { mark: React.ReactNode; label: string }) {
  const ink = useStudyInk();
  return (
    <View className="flex-row items-center gap-2">
      {mark}
      <Text className="text-base" style={[nepaliTextStyle(16), { color: ink.dim }]}>
        {label}
      </Text>
    </View>
  );
}

/** The website's `tmDiagramSvg`: the drawing at full width, its height from the viewBox. */
function TmSvg({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const ink = useStudyInk();
  return (
    <View className="w-full" style={{ aspectRatio: w / h }}>
      <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" color={ink.ink}>
        <G fontFamily={STUDY_FONT.regular}>{children}</G>
      </Svg>
    </View>
  );
}
