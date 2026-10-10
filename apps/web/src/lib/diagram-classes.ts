import { cn } from "./utils";

/** Interactive study / tithi diagram SVG classes. */

// ── Earth diagram (ed-*) ──────────────────────────────────────

export const edMoonDisk =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_35%,transparent)] dark:stroke-[#5a6a72]";

export const edMoonLit =
  "[filter:drop-shadow(0_0_2px_color-mix(in_srgb,#fff_25%,transparent))]";

export const edMoonHalo =
  "fill-[color-mix(in_srgb,var(--tm-teal)_8%,transparent)]";

export const edMoonRim =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_40%,transparent)]";

export const edMoonFullRing =
  "stroke-[color-mix(in_srgb,#fff_55%,transparent)] opacity-[0.55]";

export const edMoonNew =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_50%,transparent)] dark:stroke-[#3a454c]";

export const edOrbitDir =
  "stroke-[var(--tm-teal)] [stroke-width:2] stroke-round opacity-[0.85]";

export const edOrbitDirArrow = "fill-[var(--tm-teal)]";

export const edOrbitDirLabel =
  "fill-[var(--tm-teal)] text-sm font-semibold [font-family:var(--pn-font)]";

export const edAxis =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_42%,transparent)] [stroke-width:1.2] [stroke-dasharray:2_6]";

export const edOrbit =
  "fill-none stroke-[var(--tm-ring-soft)] [stroke-width:1]";

export const edEarthSolarOrbit =
  "fill-none stroke-[color-mix(in_srgb,var(--tm-amber)_45%,transparent)] [stroke-width:1.6] [stroke-dasharray:5_6]";

export const edEarthOrbitArrow =
  "fill-[color-mix(in_srgb,var(--tm-amber)_70%,transparent)]";

export const edEarthOrbitLabel =
  "fill-[color-mix(in_srgb,var(--tm-amber)_80%,var(--tm-ink-faint))] text-sm font-semibold [font-family:var(--pn-font)]";

export const edRing =
  "fill-none stroke-[color-mix(in_srgb,var(--tm-teal)_36%,transparent)] [stroke-width:1.4]";

export const edDegtick = "stroke-[var(--tm-gold)]";

export const edDeglabel =
  "fill-[var(--tm-gold)] font-num text-base font-bold";

export const edLens =
  "fill-[var(--tm-amber)] stroke-[color-mix(in_srgb,#000_30%,transparent)] [stroke-width:0.5]";

export const edTnum =
  "fill-[var(--tm-ink-faint)] font-num text-sm font-semibold";

export const edCurband =
  "fill-none stroke-[var(--tm-gold)] [stroke-width:2]";

export const edArc =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_35%,var(--tm-border))] [stroke-width:3.2] stroke-round dark:stroke-[color-mix(in_srgb,#c9d6da_60%,transparent)]";

export const edArcCap =
  "fill-[color-mix(in_srgb,var(--tm-teal)_8%,var(--tm-card))] dark:fill-[#e7eef0]";

export const edArcVal =
  "fill-[var(--tm-teal)] font-num text-xl font-bold";

export const edRmline =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_40%,transparent)] [stroke-width:1]";

export const edRay =
  "stroke-[#ffce5a] [stroke-width:2.4] stroke-round opacity-80";

export const edBodyLabel =
  "fill-[var(--tm-ink-dim)] text-base font-semibold [font-family:var(--pn-font)]";

export const edTiltLabel =
  "fill-foreground text-sm font-semibold [font-family:var(--pn-font)] dark:fill-white";

export const edTiltRim =
  "stroke-[color-mix(in_srgb,var(--foreground)_35%,transparent)] opacity-[0.55] dark:stroke-[color-mix(in_srgb,#fff_45%,transparent)]";

export const edTiltEq =
  "stroke-[color-mix(in_srgb,var(--foreground)_40%,transparent)] opacity-[0.65] dark:stroke-[color-mix(in_srgb,#fff_50%,transparent)]";

export const edTiltPole =
  "stroke-foreground opacity-90 dark:stroke-white";

export const edTiltCap = "fill-[#8ed4a0]";

export const edPaksha =
  "fill-[var(--tm-ink-faint)] text-sm font-semibold tracking-wide [font-family:var(--pn-font)]";

export function edEndNe() {
  return "fill-[var(--tm-gold)] text-base font-bold [font-family:var(--pn-font)]";
}

export function edEndEn() {
  return "fill-[var(--tm-ink-faint)] font-num text-xs text-base tracking-widest";
}

export const edScrub =
  "ed-scrub flex-1 min-w-0 w-full h-[5px] rounded-full outline-none cursor-pointer";

export function edTnumCur(cur?: boolean) {
  return cn(edTnum, cur && "fill-[var(--tm-gold)] font-bold");
}

export function edPakshaOn(on?: boolean) {
  return cn(edPaksha, on && "fill-[var(--tm-gold)]");
}

// ── Eclipse geometry (ecl-*) ──────────────────────────────────

export const eclPanelBg =
  "fill-[color-mix(in_srgb,var(--tm-card)_92%,#f4f7fb)] dark:fill-[color-mix(in_srgb,#0e1520_88%,var(--tm-card))]";

export const ecleclipticRing =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_88%,transparent)] [stroke-width:2.2] stroke-round";

export const eclAxis =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_35%,transparent)] [stroke-width:1] [stroke-dasharray:3_8]";

export const eclRay =
  "stroke-[color-mix(in_srgb,#ffcf57_75%,transparent)] [stroke-width:2.2] stroke-round";

export const eclSunDisc =
  "stroke-[color-mix(in_srgb,#e08a10_35%,transparent)] [stroke-width:1.5]";

export const eclPenumbra =
  "fill-[color-mix(in_srgb,var(--tm-ink)_10%,transparent)] dark:fill-[color-mix(in_srgb,#0a0e12_34%,transparent)]";

export const eclUmbraShape = "stroke-none";

export const eclBodyLabel =
  "fill-[color-mix(in_srgb,var(--tm-ink)_72%,transparent)] text-sm font-semibold [font-family:var(--pn-font)]";

export const eclPlaneCaption =
  "fill-[color-mix(in_srgb,var(--tm-ink)_58%,transparent)] text-sm font-semibold [font-family:var(--pn-font)]";

export const eclNodeDot =
  "fill-[var(--tm-ink)] stroke-[var(--tm-card)] [stroke-width:2]";

export const eclNodeLine =
  "stroke-[var(--tm-amber)] [stroke-width:2.8] [stroke-dasharray:10_7] stroke-round opacity-[0.95]";

export const eclNodeCallout = "pointer-events-none";

export const eclNodeArrow =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_55%,transparent)] [stroke-width:1.4]";

export const eclNodeArrowHead =
  "fill-[color-mix(in_srgb,var(--tm-ink)_70%,transparent)]";

export const eclNodeTitle =
  "fill-[color-mix(in_srgb,var(--tm-ink)_88%,transparent)] text-base font-bold [font-family:var(--pn-font)]";

export const eclNodeSym =
  "fill-[var(--tm-amber)] text-lg font-extrabold [font-family:var(--pn-font)]";

export const eclEarthGlow =
  "fill-[color-mix(in_srgb,var(--tm-teal)_12%,transparent)]";

export const eclBloodGlow =
  "fill-[color-mix(in_srgb,#d2402a_38%,transparent)]";

export const eclBloodTint =
  "fill-[color-mix(in_srgb,#c0392b_46%,transparent)] [mix-blend-mode:multiply]";

export const eclMoonEclipsed =
  "[filter:drop-shadow(0_0_6px_color-mix(in_srgb,#e0473a_60%,transparent))]";

export const eclStatus =
  "text-lg font-extrabold [font-family:var(--pn-font)]";

export const eclStatusSub =
  "fill-[var(--tm-ink-faint)] font-num text-sm font-semibold";

export const eclTiltNote =
  "fill-[var(--tm-ink-faint)] text-xs text-base [font-family:var(--pn-font)]";

export function eclMoonOrbit(above?: boolean) {
  return cn(
    "fill-none stroke-round",
    above
      ? "stroke-[color-mix(in_srgb,var(--tm-ink)_82%,transparent)] [stroke-width:2] [stroke-dasharray:9_7]"
      : "stroke-[color-mix(in_srgb,var(--tm-ink)_48%,transparent)] [stroke-width:1.7] [stroke-dasharray:7_8]",
  );
}

export function eclStatusTotal() {
  return cn(eclStatus, "fill-[#d2402a]");
}

export function eclStatusPartial() {
  return cn(eclStatus, "fill-[var(--tm-amber)]");
}

export function eclStatusPenumbral() {
  return cn(eclStatus, "fill-[var(--tm-ink-dim)]");
}

export function eclStatusSolar() {
  return cn(eclStatus, "fill-[var(--tm-gold)]");
}

export function eclStatusNone() {
  return cn(eclStatus, "fill-[var(--tm-ink-faint)]");
}

export function eclStatusFor(
  status: "total" | "partial" | "penumbral" | "none",
  solar?: boolean,
) {
  if (status === "total") return eclStatusTotal();
  if (status === "partial") return eclStatusPartial();
  if (status === "penumbral") return eclStatusPenumbral();
  if (solar) return eclStatusSolar();
  return eclStatusNone();
}

// ── Moon orbit tilt (mot-*) ─────────────────────────────────────

export const motPlaneFace = "stroke-none";

export const motPlaneRim =
  "stroke-[color-mix(in_srgb,#8fc0ff_62%,transparent)] [stroke-width:2]";

export const motPlaneLabel =
  "fill-[#9fb6d8] text-sm font-semibold [font-family:var(--pn-font)]";

export const motEarthLabel = "fill-[#d4e4ee]";

export const motNodeTrack =
  "stroke-[color-mix(in_srgb,#ffd86b_32%,transparent)] [stroke-width:1.6] [stroke-dasharray:2_7]";

export const motNodeLine =
  "stroke-[color-mix(in_srgb,#ffd86b_52%,transparent)] [stroke-width:3] [stroke-dasharray:9_6]";

export const motSunRay =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_60%,transparent)] [stroke-width:1.6] [stroke-dasharray:5_5]";

export const motArrowHead =
  "fill-[color-mix(in_srgb,var(--tm-gold)_75%,transparent)]";

export const motSunLabel =
  "fill-[#ffdd80] text-sm font-semibold [font-family:var(--pn-font)]";

export const motEarthGlow =
  "fill-[color-mix(in_srgb,#5aa9ff_22%,transparent)]";

export const motTiltArc = "stroke-[#ffd86b] [stroke-width:2]";

export const motTiltLabel =
  "fill-[#ffe08a] text-base font-bold [font-family:var(--pn-font)]";

export const motNode =
  "fill-[#3ddc6f] stroke-[#07203a] [stroke-width:2.5]";

export const motNodeDot = "fill-[#07351c]";

export const motNodeLabel =
  "fill-[#84f0aa] text-lg font-bold [font-family:var(--pn-font)]";

export const motHeightPost =
  "stroke-[color-mix(in_srgb,#cfe0ea_32%,transparent)] [stroke-width:1.3] [stroke-dasharray:2_4]";

export const motBaseDot =
  "fill-[color-mix(in_srgb,#cfe0ea_42%,transparent)]";

export const motMoon = "stroke-[rgba(255,255,255,0.4)] [stroke-width:1]";

export const motMoonSubmerged = "opacity-50";

export const motMoonHalo = "fill-transparent";

export const motMoonLabel =
  "fill-[#d4e4ee] text-sm font-semibold [font-family:var(--pn-font)]";

export const motLegendLabel =
  "fill-[#9fb6d8] text-sm font-semibold [font-family:var(--pn-font)]";

export const motSunBeam =
  "stroke-[color-mix(in_srgb,#ff4d6a_36%,transparent)] [stroke-width:34] stroke-round";

export const motSunOutline =
  "stroke-[#0a1730] [stroke-width:17] stroke-round opacity-[0.92]";

export const motSunLine =
  "stroke-[#ff4d6a] [stroke-width:11] stroke-round";

export const motShadowDot = "fill-[rgba(212,228,238,0.62)]";

export const motShadowLabel =
  "fill-[#d4e4ee] text-xs font-semibold [font-family:var(--pn-font)]";

export const motEclipseGlow =
  "fill-[color-mix(in_srgb,#d2402a_45%,transparent)]";

export const motMoonEclipsing =
  "[filter:drop-shadow(0_0_7px_color-mix(in_srgb,#e0473a_55%,transparent))]";

export const motEclipseBanner =
  "text-lg font-extrabold [font-family:var(--pn-font)]";

export const motSeasonBanner =
  "fill-[#d4e4ee] text-base font-bold [font-family:var(--pn-font)]";

export function motOrbit(variant: "above" | "below" | "cross") {
  const m = {
    above: "stroke-[#ffd23a] [stroke-width:6]",
    below: "stroke-[#c2a443] [stroke-width:5] opacity-90",
    cross: "stroke-[#4ade80] [stroke-width:6.5]",
  };
  return cn("stroke-round", m[variant]);
}

export function motTiltRef(orbit?: boolean) {
  return cn(
    "stroke-[color-mix(in_srgb,#cfe0ea_34%,transparent)] [stroke-width:1.4]",
    orbit && "stroke-[color-mix(in_srgb,#ffd86b_70%,transparent)]",
  );
}

export function motMoonHaloDir(dir?: "up" | "down") {
  return cn(
    motMoonHalo,
    dir === "up" && "fill-[color-mix(in_srgb,#ffd86b_24%,transparent)]",
    dir === "down" && "fill-[color-mix(in_srgb,#5aa9ff_22%,transparent)]",
  );
}

export function motSunBeamAligned(aligned?: boolean) {
  return cn(
    motSunBeam,
    aligned &&
      "stroke-[color-mix(in_srgb,#ff2348_44%,transparent)] [stroke-width:42]",
  );
}

export function motSunOutlineAligned(aligned?: boolean) {
  return cn(motSunOutline, aligned && "[stroke-width:21]");
}

export function motSunLineAligned(aligned?: boolean) {
  return cn(
    motSunLine,
    aligned && "stroke-[#ff2348] [stroke-width:14]",
  );
}

export function motEclipseGlowType(type: "lunar" | "solar") {
  return cn(
    type === "lunar"
      ? "fill-[color-mix(in_srgb,#d2402a_45%,transparent)]"
      : "fill-[color-mix(in_srgb,#ffcf57_55%,transparent)]",
  );
}

export function motEclipseBannerType(type: "lunar" | "solar") {
  return cn(
    motEclipseBanner,
    type === "lunar" ? "fill-[#d2402a]" : "fill-[#d99a18]",
  );
}

// ── Solar eclipse (sol-*) ───────────────────────────────────────

export const solLight =
  "fill-[color-mix(in_srgb,#ffd24a_9%,transparent)]";

export const solRay =
  "stroke-[color-mix(in_srgb,#ffcf57_70%,transparent)] [stroke-width:2.4] stroke-round";

export const solSunGlow =
  "fill-[color-mix(in_srgb,#ffcf57_26%,transparent)]";

export const solPenumbra =
  "fill-[color-mix(in_srgb,var(--tm-ink)_18%,transparent)] dark:fill-[color-mix(in_srgb,#000_34%,transparent)]";

export const solAntumbra =
  "fill-[color-mix(in_srgb,var(--tm-ink)_32%,transparent)] dark:fill-[color-mix(in_srgb,#000_52%,transparent)]";

export const solUmbra = "fill-[color-mix(in_srgb,#11151b_88%,transparent)]";

export const solLegendLabel =
  "fill-[var(--tm-ink-faint)] text-sm font-semibold [font-family:var(--pn-font)]";

export const solMoon =
  "fill-[#2b2f36] stroke-[color-mix(in_srgb,#fff_45%,transparent)] [stroke-width:1.5]";

export const solMoonLabel =
  "fill-[var(--tm-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]";

export const solEarthGlow =
  "fill-[color-mix(in_srgb,var(--tm-teal)_18%,transparent)]";

export const solSpotPen =
  "fill-[color-mix(in_srgb,#11151b_22%,transparent)]";

export const solSpotUmbra = "fill-[#0a0c10]";

export const solSpotAnti =
  "fill-[color-mix(in_srgb,#11151b_46%,transparent)] stroke-[#ffd24a] [stroke-width:1.5]";

export const solBanner =
  "text-lg font-extrabold [font-family:var(--pn-font)]";

export const solEyeFrame =
  "fill-[var(--tm-card)] stroke-[var(--tm-border)] [stroke-width:1.5]";

export const solEyeTitle =
  "fill-[var(--tm-ink-faint)] text-sm font-bold tracking-wide [font-family:var(--pn-font)]";

export const solEyeSky = "fill-[#070b16]";

export const solEyeSun = "fill-[#ffd24a]";

export const solEyeMoon = "fill-[#05070c]";

export const solCorona = "fill-[url(#sol-coronaGrad)]";

export const solEyeRim =
  "fill-none stroke-[var(--tm-border)] [stroke-width:2]";

const SOL_EYE_STATUS =
  "fill-[var(--tm-ink-dim)] text-base font-bold [font-family:var(--pn-font)]";

export function solBannerType(type: "total" | "annular" | "partial") {
  const m = {
    total: "fill-[#d2402a]",
    annular: "fill-[#e0901a]",
    partial: "fill-[var(--tm-ink-dim)]",
  };
  return cn(solBanner, m[type]);
}

export function solEyeStatus(type: "total" | "annular" | "default" = "default") {
  if (type === "total") return cn(SOL_EYE_STATUS, "fill-[#d2402a]");
  if (type === "annular") return cn(SOL_EYE_STATUS, "fill-[#e0901a]");
  return SOL_EYE_STATUS;
}

// ── Heliocentric orbit (ho-*) ───────────────────────────────────

export const hoOrbitEllipse =
  "fill-none stroke-[var(--tm-ring-soft)] [stroke-width:1.6] [stroke-dasharray:6_5]";

export const hoOrbitGuide =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_12%,transparent)] [stroke-width:1] [stroke-dasharray:3_8] opacity-[0.45]";

export const hoFocusLine =
  "stroke-[color-mix(in_srgb,var(--tm-amber)_45%,transparent)] [stroke-width:1.2] [stroke-dasharray:4_5]";

export const hoFocusAphelion =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_40%,transparent)]";

export const hoFocusLabel =
  "fill-[var(--tm-ink-faint)] text-sm font-semibold [font-family:var(--pn-font)]";

export const hoOrbitDir =
  "fill-[var(--tm-teal)] text-sm font-semibold [font-family:var(--pn-font)]";

export const hoMarkerDot =
  "fill-[var(--tm-teal)] stroke-[var(--tm-card)] [stroke-width:2]";

export const hoMarkerNe =
  "fill-[var(--tm-ink)] text-sm font-bold [font-family:var(--pn-font)]";

export const hoMarkerDetail =
  "fill-[var(--tm-ink-dim)] text-xs font-semibold [font-family:var(--pn-font)]";

export const hoMarkerTag =
  "fill-[var(--tm-amber)] text-sm font-semibold [font-family:var(--pn-font)]";

export const hoMarkerEn =
  "fill-[var(--tm-ink-faint)] text-sm text-base [font-family:var(--pn-font)]";

export const hoSweep =
  "stroke-[var(--tm-amber)] [stroke-width:2.8] stroke-round opacity-[0.85]";

export const hoStarRay =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_28%,transparent)] [stroke-width:1.4] [stroke-dasharray:5_6]";

export const hoStarLabel =
  "fill-[var(--tm-ink-faint)] text-xs font-semibold [font-family:var(--pn-font)]";

export const hoSunRay =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_55%,transparent)] [stroke-width:1.3] [stroke-dasharray:4_5]";

export const hoEarthGlow =
  "fill-[color-mix(in_srgb,var(--tm-teal)_12%,transparent)]";

export const hoEarthGroup = "will-change-transform";

export const hoEquator =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_75%,white)] [stroke-width:2.2] stroke-round";

export const hoTiltRef =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_22%,transparent)] [stroke-width:1.2] [stroke-dasharray:3_4]";

export const hoTiltArc =
  "stroke-[var(--tm-amber)] [stroke-width:1.6] stroke-round";

export const hoPoleAxis =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_70%,transparent)] [stroke-width:2.8] stroke-round";

export const hoNorthPole =
  "fill-[var(--tm-amber)] stroke-[var(--tm-card)] [stroke-width:1.5]";

export const hoPoleLabel =
  "fill-[var(--tm-amber)] text-xs font-semibold [font-family:var(--pn-font)]";

export const hoCalloutNe =
  "fill-[var(--tm-ink)] text-sm font-bold [font-family:var(--pn-font)]";

export const hoCalloutSub =
  "fill-[var(--tm-ink-faint)] font-num text-sm font-semibold";

// ── Earth globe ─────────────────────────────────────────────────

export const earthGlobeObject = "pointer-events-none";

export const earthGlobeRim =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_38%,transparent)] [stroke-width:1.3] dark:stroke-[color-mix(in_srgb,#d4ecff_34%,transparent)]";

// ── Sun–season rotation (ss-rot-*) ──────────────────────────────

export const ssRotDir =
  "fill-[var(--tm-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]";

export const ssRotAxis =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_18%,transparent)] [stroke-width:1.2] [stroke-dasharray:4_5]";

export const ssRotGlow =
  "fill-[color-mix(in_srgb,var(--tm-teal)_10%,transparent)]";

export const ssRotPole =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_45%,transparent)] [stroke-width:2] stroke-round";

export const ssRotCurve =
  "stroke-[var(--tm-amber)] [stroke-width:2.4] stroke-round";

export const ssRotArrowHead = "fill-[var(--tm-amber)]";

export const ssRotLabel =
  "fill-[var(--tm-teal)] text-sm font-semibold [font-family:var(--pn-font)]";

// ── Sun–Earth–Moon semester (sem-*) ─────────────────────────────

export const semOrbit =
  "fill-none stroke-[var(--tm-ring-soft)] [stroke-width:1.4]";

export const semOrbitGuide =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_12%,transparent)] [stroke-width:1] [stroke-dasharray:3_8] opacity-[0.45]";

export const semMonthTick =
  "stroke-[var(--tm-gold)] [stroke-width:1] opacity-[0.75]";

export const semMonthLabel =
  "fill-[var(--tm-ink-faint)] text-sm font-semibold [font-family:var(--pn-font)]";

export const semMoonOrbit =
  "fill-none stroke-[color-mix(in_srgb,var(--tm-teal)_32%,transparent)] [stroke-width:1.1] [stroke-dasharray:3_4]";

export const semMoonOrbitGuide =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_18%,transparent)] [stroke-width:0.9] [stroke-dasharray:2_6] opacity-50";

export const semMoonLabel =
  "fill-[var(--tm-ink-faint)] font-num text-sm font-semibold";

export const semRadiusLine =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_16%,transparent)] [stroke-width:1] [stroke-dasharray:2_6]";

export const semeclipticGrid = "pointer-events-none";

export const semGridRashiSeg =
  "fill-[color-mix(in_srgb,var(--tm-amber)_6%,transparent)] stroke-none";

export const semGridNakSeg =
  "fill-[color-mix(in_srgb,var(--tm-teal)_5%,transparent)] stroke-none";

export const semGridRashiLine =
  "stroke-[color-mix(in_srgb,var(--tm-amber)_38%,transparent)] [stroke-width:1.4]";

export const semGridNakLine =
  "stroke-[color-mix(in_srgb,var(--tm-teal)_22%,transparent)] [stroke-width:0.65] [stroke-dasharray:2_4]";

export const semGridRashiLabel =
  "fill-[var(--tm-ink-faint)] text-sm font-semibold [font-family:var(--pn-font)]";

export const semGridNakLabel =
  "fill-[color-mix(in_srgb,var(--tm-teal)_75%,var(--tm-ink-faint))] text-[8.5px] font-semibold [font-family:var(--pn-font)]";

export const semSunLonRay =
  "stroke-[color-mix(in_srgb,var(--tm-amber)_70%,transparent)] [stroke-width:1.8] [stroke-dasharray:4_5] pointer-events-none";

export const semSunLonMarker =
  "fill-[var(--tm-amber)] stroke-[color-mix(in_srgb,var(--tm-card)_85%,white)] [stroke-width:2] pointer-events-none";

export const semEarthGlow =
  "fill-[color-mix(in_srgb,var(--tm-teal)_12%,transparent)]";

export const semEarthNight =
  "fill-[color-mix(in_srgb,#000_55%,transparent)]";

export const semSpinArm =
  "stroke-[var(--tm-gold)] [stroke-width:1.6] stroke-round";

export const semSpinDot =
  "fill-[var(--tm-gold)] stroke-[var(--tm-card)] [stroke-width:1]";

export const semTidalMarker =
  "fill-[color-mix(in_srgb,#000_45%,transparent)]";

export function semMonthLabelCur(cur?: boolean) {
  return cn(semMonthLabel, cur && "fill-[var(--tm-gold)] font-bold");
}

export function semMoonLabelKey(key?: boolean) {
  return cn(
    semMoonLabel,
    key &&
      "fill-[var(--tm-teal)] text-sm font-bold [font-family:var(--pn-font)]",
  );
}

export function semGridRashiSegVariant(opts?: {
  alt?: boolean;
  cur?: boolean;
}) {
  return cn(
    semGridRashiSeg,
    opts?.alt && "fill-[color-mix(in_srgb,var(--tm-amber)_3%,transparent)]",
    opts?.cur &&
      "fill-[color-mix(in_srgb,var(--tm-amber)_22%,transparent)] stroke-[color-mix(in_srgb,var(--tm-amber)_55%,transparent)] [stroke-width:1.2]",
  );
}

export function semGridNakSegVariant(opts?: { alt?: boolean; cur?: boolean }) {
  return cn(
    semGridNakSeg,
    opts?.alt && "fill-[color-mix(in_srgb,var(--tm-teal)_2.5%,transparent)]",
    opts?.cur &&
      "fill-[color-mix(in_srgb,var(--tm-teal)_18%,transparent)] stroke-[color-mix(in_srgb,var(--tm-teal)_45%,transparent)] [stroke-width:1]",
  );
}

export function semGridRashiLabelCur(cur?: boolean) {
  return cn(semGridRashiLabel, cur && "fill-[var(--tm-amber)] font-bold");
}

export function semGridNakLabelCur(cur?: boolean) {
  return cn(semGridNakLabel, cur && "fill-[var(--tm-teal)] font-bold");
}

// ── Tithi mechanics timeline (tm-*) ─────────────────────────────

export const tmAxis = "stroke-[var(--tm-ring-soft)] [stroke-width:1]";

export const tmSunline =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_60%,transparent)] [stroke-width:1.2] [stroke-dasharray:3_3]";

export const tmSundot = "fill-[#ffd24a]";

export const tmSunray =
  "stroke-[#ffce5a] [stroke-width:1.6] stroke-round";

export const tmNewmoon =
  "fill-[color-mix(in_srgb,var(--tm-ink)_85%,transparent)] dark:fill-[#1a2226]";

export const tmDate = "fill-[var(--tm-ink)] font-num text-sm font-bold";

export const tmDateSub =
  "fill-[var(--tm-ink-faint)] text-sm text-base [font-family:var(--pn-font)]";

export const tmTlCap =
  "fill-[var(--tm-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]";

export const tmTravel =
  "stroke-[color-mix(in_srgb,var(--tm-ink)_30%,transparent)] [stroke-width:1.4]";

export const tmTravelHead =
  "fill-[color-mix(in_srgb,var(--tm-ink)_40%,transparent)]";

export const tmTrackLabel =
  "fill-[var(--tm-ink)] text-base font-bold [font-family:var(--pn-font)]";

export const tmTrackSub =
  "fill-[var(--tm-ink-faint)] text-sm text-base [font-family:var(--pn-font)]";

export const tmSolarBand =
  "fill-[color-mix(in_srgb,var(--tm-gold)_16%,transparent)] stroke-[color-mix(in_srgb,var(--tm-gold)_42%,transparent)] [stroke-width:1.2]";

export const tmSegSym =
  "fill-[var(--tm-gold)] text-base font-normal [font-family:var(--pn-font)]";

export const tmVline =
  "stroke-[color-mix(in_srgb,var(--tm-gold)_45%,transparent)] [stroke-width:1] [stroke-dasharray:3_4]";

export const tmAdhikRing =
  "fill-none stroke-[var(--tm-amber)] [stroke-width:1.6] [stroke-dasharray:6_4]";

export const tmAdhikNote =
  "fill-[var(--tm-amber)] text-sm font-semibold [font-family:var(--pn-font)]";

export function tmBand(opts?: { alt?: boolean; dup?: boolean; skip?: boolean }) {
  return cn(
    "fill-[color-mix(in_srgb,var(--tm-teal)_14%,transparent)] stroke-[color-mix(in_srgb,var(--tm-teal)_30%,transparent)] [stroke-width:1]",
    opts?.alt && "fill-[color-mix(in_srgb,var(--tm-teal)_22%,transparent)]",
    opts?.dup &&
      "fill-[color-mix(in_srgb,var(--tm-amber)_30%,transparent)] stroke-[var(--tm-amber)] [stroke-width:1.6]",
    opts?.skip &&
      "fill-[color-mix(in_srgb,var(--tm-amber)_10%,transparent)] stroke-[var(--tm-amber)] [stroke-width:1.4] [stroke-dasharray:5_4]",
  );
}

export function tmBandNo(hot?: boolean) {
  return cn(
    "fill-[var(--tm-ink)] font-num text-base font-bold",
    hot && "fill-[var(--tm-amber)]",
  );
}

export function tmBandName(hot?: boolean) {
  return cn(
    "fill-[var(--tm-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]",
    hot && "fill-[var(--tm-amber)]",
  );
}

export function tmLunarBand(adhik?: boolean) {
  return cn(
    "fill-[color-mix(in_srgb,var(--tm-teal)_16%,transparent)] stroke-[color-mix(in_srgb,var(--tm-teal)_40%,transparent)] [stroke-width:1.2]",
    adhik &&
      "fill-[color-mix(in_srgb,var(--tm-amber)_28%,transparent)] stroke-[var(--tm-amber)] [stroke-width:1.8]",
  );
}

export function tmSegName(adhik?: boolean) {
  return cn(
    "fill-[var(--tm-ink)] text-sm font-bold [font-family:var(--pn-font)]",
    adhik && "fill-[var(--tm-amber)]",
  );
}

export function tmSegTag(adhik?: boolean) {
  return cn(
    "fill-[var(--tm-ink-faint)] text-sm text-base [font-family:var(--pn-font)]",
    adhik &&
      "fill-[color-mix(in_srgb,var(--tm-amber)_80%,white_10%)] font-semibold",
  );
}
