/** Box-and-arrow layout of the calculation pipeline. Both SVG drawings read this. */

export type PipelineAccent = "teal" | "amber" | "gold";

export type PipelineBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  labelKey: string;
  accent?: PipelineAccent;
};

export const PIPELINE_W = 920;
export const PIPELINE_H = 520;

export const PIPELINE_GROUPS = [
  { x: 32, y: 118, labelKey: "learn.study.pipeline.group_foundation" },
  { x: 32, y: 208, labelKey: "learn.study.pipeline.group_raw" },
  { x: 32, y: 298, labelKey: "learn.study.pipeline.group_angas" },
  { x: 32, y: 388, labelKey: "learn.study.pipeline.group_daily" },
  { x: 520, y: 118, labelKey: "learn.study.pipeline.group_apps" },
] as const;

export const PIPELINE_BOXES: PipelineBox[] = [
  { id: "loc", x: 32, y: 128, w: 118, h: 52, labelKey: "learn.study.pipeline.node_observer" },
  { id: "jd", x: 168, y: 128, w: 118, h: 52, labelKey: "learn.study.pipeline.node_julian_day" },
  { id: "ephe", x: 304, y: 124, w: 140, h: 60, labelKey: "learn.study.pipeline.node_ephemeris", accent: "teal" },
  { id: "rs", x: 32, y: 218, w: 130, h: 52, labelKey: "learn.study.pipeline.node_rise_set" },
  { id: "lon", x: 180, y: 218, w: 150, h: 52, labelKey: "learn.study.pipeline.node_longitudes" },
  { id: "lag", x: 348, y: 218, w: 118, h: 52, labelKey: "learn.study.pipeline.node_lagna" },
  { id: "five", x: 32, y: 308, w: 160, h: 56, labelKey: "learn.study.pipeline.node_five_angas", accent: "amber" },
  { id: "bnd", x: 210, y: 308, w: 130, h: 56, labelKey: "learn.study.pipeline.node_end_times" },
  { id: "uday", x: 32, y: 398, w: 150, h: 56, labelKey: "learn.study.pipeline.node_panchanga_day", accent: "teal" },
  { id: "civ", x: 200, y: 398, w: 118, h: 56, labelKey: "learn.study.pipeline.node_civil_timeline" },
  { id: "at", x: 336, y: 398, w: 100, h: 56, labelKey: "learn.study.pipeline.node_at_time" },
  { id: "patro", x: 520, y: 128, w: 120, h: 44, labelKey: "learn.study.pipeline.node_patro" },
  { id: "fest", x: 656, y: 128, w: 120, h: 44, labelKey: "learn.study.pipeline.node_festivals" },
  { id: "sait", x: 792, y: 128, w: 108, h: 44, labelKey: "learn.study.pipeline.node_sait" },
  { id: "gochar", x: 520, y: 188, w: 120, h: 44, labelKey: "learn.study.pipeline.node_gochar" },
  { id: "ecl", x: 656, y: 188, w: 120, h: 44, labelKey: "learn.study.pipeline.node_eclipses" },
  { id: "kun", x: 792, y: 188, w: 108, h: 44, labelKey: "learn.study.pipeline.node_kundali" },
];

export const PIPELINE_ARROWS = [
  "M150 154 H168",
  "M286 154 H304",
  "M374 184 V208",
  "M97 180 V218",
  "M330 270 V308",
  "M192 334 H210",
  "M112 364 V398",
  "M374 426 H520",
  "M182 426 H520",
] as const;

export const PIPELINE_GRAHAS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;
