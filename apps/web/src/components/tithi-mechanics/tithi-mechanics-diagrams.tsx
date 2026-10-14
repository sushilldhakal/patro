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
} from "@/lib/diagram-classes";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { WHEEL_TITHIS, tithiNum } from "@vedic-patro/domain/tithi-wheel-data";
import { tmAmLegend, tmCal, tmCalCellDup, tmCalGap, tmCalGate, tmCalNo, tmCalTithi, tmDiagramSvg, tmLegAdhik } from "@/lib/learn-classes";
import { TmLegendDot, TmNewMoon, TmSun } from "./diagram-glyphs";
import { tFor } from "@vedic-patro/i18n/runtime";

function tName(band: number) {
  return WHEEL_TITHIS[((band % 30) + 30) % 30]!;
}
function tNo(band: number) {
  return tithiNum(((band % 30) + 30) % 30);
}

export function SunriseTimeline({ mode }: { mode: "vriddhi" | "kshaya" }) {
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
      <g key={`b${b}`}>
        <rect
          x={x0}
          y={trackTop}
          width={x1 - x0}
          height={trackH}
          className={tmBand({ alt: b % 2 === 1, dup: isDup, skip: isSkip })}
        />
        <text
          x={(x0 + x1) / 2}
          y={trackTop + 25}
          className={tmBandNo(isDup || isSkip)}
          textAnchor="middle"
        >
          {fmt(tNo(b))}
        </text>
        <text
          x={(x0 + x1) / 2}
          y={trackTop + 45}
          className={tmBandName(isDup || isSkip)}
          textAnchor="middle"
        >
          {tName(b).ne}
        </text>
      </g>
    );
  }

  const marks = sun.map((e, i) => {
    const x = mapE(e);
    return (
      <g key={`s${i}`}>
        <line x1={x} y1={trackTop - 22} x2={x} y2={trackTop + trackH + 10} className={tmSunline} />
        <TmSun x={x} y={trackTop - 34} r={10} />
        <text x={x} y={trackTop + trackH + 30} className={tmDate} textAnchor="middle">
          {fmt(startGate + i)}{tFor("ne", "dainik.text")}
        </text>
        <text x={x} y={trackTop + trackH + 46} className={tmDateSub} textAnchor="middle">
          {tFor("ne", "panchanga.wheel.sunrise")}
        </text>
      </g>
    );
  });

  const cal = sun.map((_, i) => ({ gate: startGate + i, band: sunBand[i]! }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className={tmDiagramSvg}>
        <line
          x1={padL - 6}
          y1={trackTop + trackH / 2}
          x2={W - padR + 6}
          y2={trackTop + trackH / 2}
          className={tmAxis}
        />
        {bands}
        {marks}
        <text x={padL - 2} y={36} className={tmTlCap}>
          {tFor("ne", "ui.tithi_mechanics.x_0b057b2f")}{fmt(rate)}{tFor("ne", "ui.tithi_mechanics.x_6a013502")}{isVri ? tFor("ne", "ui.tithi_mechanics.x_dd1238ac") : tFor("ne", "ui.tithi_mechanics.x_d3495442")})
        </text>
        <line x1={padL} y1={52} x2={W - padR} y2={52} className={tmTravel} />
        <polygon
          points={`${W - padR},52 ${W - padR - 11},47 ${W - padR - 11},57`}
          className={tmTravelHead}
        />
      </svg>

      <div className={tmCal}>
        {cal.map((c, i) => {
          const prevSame = i > 0 && cal[i - 1]!.band === c.band;
          const jump = i > 0 && c.band - cal[i - 1]!.band >= 2;
          const dup = prevSame || (isVri && i < nDays - 1 && cal[i + 1]?.band === c.band);
          return (
            <Fragment key={i}>
              {jump && skipBand != null && (
                <div className={tmCalGap}>
                  <span>
                    {fmt(tNo(skipBand))} {tName(skipBand).ne}
                  </span>
                  <em>{tFor("ne", "ui.tithi_mechanics.x_3ff78e11")}</em>
                </div>
              )}
              <div className={tmCalCellDup(dup)}>
                <div className={tmCalGate}>{fmt(c.gate)}{tFor("ne", "dainik.text")}</div>
                <div className={tmCalTithi}>{tName(c.band).ne}</div>
                <div className={tmCalNo}>
                  {tName(c.band).paksha.split(" ")[0]} {fmt(tNo(c.band))}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function AdhikMassDiagram() {
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
    if (i < adhik) return { ne: lunarName[i]!, tag: tFor("ne", "ui.tithi_mechanics.x_80a6b6b6") };
    if (i === adhik) return { ne: tFor("ne", "ui.learn.adhik") + lunarName[i], tag: tFor("ne", "ui.tithi_mechanics.x_b82964bb") };
    return { ne: lunarName[i - 1] || tFor("ne", "learn.ashadh"), tag: tFor("ne", "ui.tithi_mechanics.x_80a6b6b6") };
  };

  const solarSegs = [];
  for (let i = 0; i < sankr.length - 1; i++) {
    const x0 = x(sankr[i]!);
    const x1 = x(sankr[i + 1]!);
    solarSegs.push(
      <g key={`sol${i}`}>
        <rect x={x0} y={solarY} width={x1 - x0} height={bandH} className={tmSolarBand} rx={6} />
        <text x={(x0 + x1) / 2} y={solarY + 22} className={tmSegSym} textAnchor="middle">
          {rashiSym[i]}
        </text>
        <text x={(x0 + x1) / 2} y={solarY + 40} className={tmSegName()} textAnchor="middle">
          {rashi[i]}{tFor("ne", "ui.tithi_mechanics.x_af2b54e2")}
        </text>
      </g>
    );
  }

  const lunarSegs = [];
  for (let i = 0; i < amav.length - 1; i++) {
    const x0 = x(amav[i]!);
    const x1 = x(amav[i + 1]!);
    const isAdhik = i === adhik;
    const lbl = labelFor(i);
    lunarSegs.push(
      <g key={`lun${i}`}>
        <rect
          x={x0}
          y={lunarY}
          width={x1 - x0}
          height={bandH}
          className={tmLunarBand(isAdhik)}
          rx={6}
        />
        <text
          x={(x0 + x1) / 2}
          y={lunarY + 21}
          className={tmSegName(isAdhik)}
          textAnchor="middle"
        >
          {lbl.ne}
        </text>
        <text
          x={(x0 + x1) / 2}
          y={lunarY + 39}
          className={tmSegTag(isAdhik)}
          textAnchor="middle"
        >
          {isAdhik ? tFor("ne", "ui.tithi_mechanics.x_c37746af") : tFor("ne", "learn.diagrams.hierarchy_step_lunar_month")}
        </text>
      </g>
    );
  }

  const sankrMarks = sankr.map((d, i) => (
    <g key={`sk${i}`}>
      <line x1={x(d)} y1={solarY - 24} x2={x(d)} y2={lunarY + bandH + 10} className={tmVline} />
      <TmSun x={x(d)} y={solarY - 34} r={10} />
    </g>
  ));
  const amavMarks = amav.map((d, i) => (
    <g key={`am${i}`}>
      <TmNewMoon x={x(d)} y={lunarY + bandH + 26} r={9} />
    </g>
  ));

  let callout = null;
  if (adhik >= 0) {
    const cx0 = x(amav[adhik]!);
    const cx1 = x(amav[adhik + 1]!);
    callout = (
      <g>
        <text x={(cx0 + cx1) / 2} y={lunarY - 12} className={tmAdhikNote} textAnchor="middle">
          {tFor("ne", "ui.learn.adhik_month")}
        </text>
        <rect
          x={cx0}
          y={lunarY - 4}
          width={cx1 - cx0}
          height={bandH + 8}
          className={tmAdhikRing}
          rx={8}
        />
      </g>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className={tmDiagramSvg}>
        <text x={padL} y={34} className={tmTrackLabel}>
          {tFor("ne", "ui.tithi_mechanics.x_32ec504d")}{" "}
          <tspan className={tmTrackSub}>{tFor("ne", "ui.tithi_mechanics.x_6134bad2")}</tspan>
        </text>
        {solarSegs}
        {sankrMarks}
        {callout}
        {lunarSegs}
        {amavMarks}
        <text x={padL} y={lunarY + bandH + 56} className={tmTrackLabel}>
          {tFor("ne", "learn.diagrams.hierarchy_step_lunar_month")}{" "}
          <tspan className={tmTrackSub}>{tFor("ne", "ui.tithi_mechanics.x_734e679e")}</tspan>
        </text>
      </svg>
      <div className={tmAmLegend}>
        <span>
          <TmLegendDot kind="sun" />{tFor("ne", "ui.tithi_mechanics.x_a2e095ec")}
        </span>
        <span>
          <TmLegendDot kind="moon" />{tFor("ne", "ui.tithi_mechanics.x_11561c52")}
        </span>
        <span>
          <i className={tmLegAdhik} />{tFor("ne", "ui.tithi_mechanics.x_2ca8db9e")}
        </span>
      </div>
    </div>
  );
}
