import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PanchangaDay } from "@/lib/api";
import { Fullscreen, Minimize2, Pause, Play } from "lucide-react";
import {
  HORA_CX,
  HORA_CY,
  HORA_DEVA,
  HORA_NRINGS,
  HORA_PLANETS,
  HORA_R_HUB,
  HORA_R_OUT0,
  HORA_SEG,
  HORA_TOTAL,
  HORA_WEEK,
  HORA_WEEK_MS,
  horaPad,
  horaPol,
  horaProgFromRingHora,
  horaRingFromJsDay,
  horaRingInner,
  horaRingMid,
  horaRingOuter,
  horaRingSeq,
  horaRulerAt,
  horaSegPath,
  horaTextArc,
  type HoraPlanetKey,
} from "@/lib/hora-data";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import { patroWheelShell } from "@/lib/patro-classes";
import {
  horaCompassEn,
  horaCompassNep,
  horaControlBtn,
  horaControlRail,
  horaExpandedShell,
  horaGlowAmber,
  horaGlowTeal,
  horaGlowViolet,
  horaGridBg,
  horaHubDay,
  horaHubNum,
  horaHubRom,
  horaHubRuler,
  horaPlayBtn,
  horaSeg,
  horaSegText,
  horaStage,
  horaStatusBar,
  horaStatusLabel,
  horaStatusVal,
  horaTheme,
  horaTickline,
  horaVerticalScrub,
} from "@/lib/hora-classes";
import { cn } from "@/lib/utils";
import { buildWheelDetail } from "@/lib/wheel-data";
import { PlanetIcon } from "./hora/PlanetIcon";

const LS_KEY = "dhakalHoraRing.v1";
const PROG_STEPS = 10_000;

interface HoraCell {
  order: number;
  ring: number;
  horaIdx: number;
  planet: HoraPlanetKey;
  pathD: string;
  tick: { x1: number; y1: number; x2: number; y2: number };
  label?: {
    pathId: string;
    pathD: string;
    name: string;
    fontSize: number;
    fill: string;
  };
}

interface Props {
  p: PanchangaDay;
  isToday?: boolean;
  timezone?: string;
}

function loadState(): { prog: number; playing: boolean } {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as {
      prog?: number;
      playing?: boolean;
    };
    return {
      prog: typeof s.prog === "number" ? s.prog : 0,
      playing: typeof s.playing === "boolean" ? s.playing : false,
    };
  } catch {
    return { prog: 0, playing: false };
  }
}

function initialProg(scrubG?: number, isToday?: boolean): number {
  if (isToday && scrubG != null) {
    const ring = horaRingFromJsDay(new Date().getDay());
    const horaIdx = Math.min(23, Math.floor((scrubG / 60) * 24));
    return horaProgFromRingHora(ring, horaIdx);
  }
  return loadState().prog;
}

function CompassMarker({ deg, nep, en }: { deg: number; nep: string; en: string }) {
  const r = HORA_R_OUT0 + 34;
  const [x, y] = horaPol(r, deg);
  const [nx0, ny0] = horaPol(HORA_R_OUT0 + 4, deg);
  const [nx1, ny1] = horaPol(HORA_R_OUT0 + 14, deg);
  return (
    <g>
      <text className={horaCompassNep} x={x} y={y - 2} textAnchor="middle">
        {nep}
      </text>
      <text className={horaCompassEn} x={x} y={y + 15} textAnchor="middle">
        {en}
      </text>
      <line
        x1={nx0}
        y1={ny0}
        x2={nx1}
        y2={ny1}
        stroke="rgba(255,255,255,.3)"
        strokeWidth="1.4"
      />
    </g>
  );
}

export function HoraRing({ p, isToday, timezone }: Props) {
  const { lang, digits } = useLocale();
  const det = useMemo(() => buildWheelDetail(p), [p]);
  const tz = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());

  const scrubG = useMemo(() => {
    const mins = minutesSinceMidnightInTimezone(now, tz, true);
    let g = (mins - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    return Math.max(0, Math.min(60, g));
  }, [now, det.sunriseMin, tz]);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const saved = loadState();
  const [prog, setProg] = useState(() => initialProg(scrubG, isToday));
  const [playing, setPlaying] = useState(saved.playing);
  const [expanded, setExpanded] = useState(false);
  const expandedHistoryRef = useRef(false);
  const ignorePopRef = useRef(false);
  const scrubbingRef = useRef(false);
  const lastRef = useRef(0);
  const saveTimerRef = useRef(0);

  useEffect(() => {
    lastRef.current = performance.now();
  }, []);

  const setExpandedMode = useCallback((next: boolean) => {
    if (next) {
      if (!expandedHistoryRef.current) {
        window.history.pushState({ horaRingExpanded: true }, "");
        expandedHistoryRef.current = true;
      }
      setExpanded(true);
      return;
    }
    setExpanded(false);
    if (expandedHistoryRef.current) {
      expandedHistoryRef.current = false;
      ignorePopRef.current = true;
      window.history.back();
    }
  }, []);

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setExpandedMode(!expanded);
    },
    [expanded, setExpandedMode],
  );

  useEffect(() => {
    if (!expanded) return;
    const onPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      expandedHistoryRef.current = false;
      setExpanded(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (expandedHistoryRef.current) {
        expandedHistoryRef.current = false;
        ignorePopRef.current = true;
        window.history.back();
      }
    };
  }, []);

  const cells = useMemo(() => {
    const out: HoraCell[] = [];
    for (let r = 0; r < HORA_NRINGS; r++) {
      const rO = horaRingOuter(r);
      const rI = horaRingInner(r);
      const rM = horaRingMid(r);
      const seq = horaRingSeq(r);
      for (let i = 0; i < 24; i++) {
        const planet = seq[i]!;
        const P = HORA_PLANETS[planet];
        const a0 = i * HORA_SEG + 1.1 / 2;
        const a1 = (i + 1) * HORA_SEG - 1.1 / 2;
        const mid = (a0 + a1) / 2;
        const flip = mid > 90 && mid < 270;
        const [tx0, ty0] = horaPol(rI, a0 - 1.1 / 2);
        const [tx1, ty1] = horaPol(rO, a0 - 1.1 / 2);
        const name = HORA_DEVA[planet];
        const arcLen = (2 * Math.PI * rM * (HORA_SEG - 1.1)) / 360;
        let fs = arcLen / (name.length * 0.62);
        let label: HoraCell["label"];
        if (fs >= 8 || i === 0) {
          fs = Math.max(8, Math.min(13.5, fs));
          const pathId = `hora-tp-${r}-${i}`;
          label = {
            pathId,
            pathD: horaTextArc(rM, a0, a1, flip),
            name,
            fontSize: fs,
            fill: P.text,
          };
        }
        out.push({
          order: r * 24 + i,
          ring: r,
          horaIdx: i,
          planet,
          pathD: horaSegPath(rO, rI, a0, a1),
          tick: { x1: tx0, y1: ty0, x2: tx1, y2: ty1 },
          label,
        });
      }
    }
    return out;
  }, []);

  const labelPaths = useMemo(
    () => cells.filter((c) => c.label).map((c) => ({ id: c.label!.pathId, d: c.label!.pathD })),
    [cells],
  );

  const save = useCallback((p: number, pl: boolean) => {
    localStorage.setItem(LS_KEY, JSON.stringify({ prog: p, playing: pl }));
  }, []);

  const gHora = prog * HORA_TOTAL;
  let gr = Math.floor(gHora / 24);
  if (gr > HORA_NRINGS - 1) gr = HORA_NRINGS - 1;
  const gi = gHora - gr * 24;
  const gii = Math.min(23, Math.floor(gi));
  const leadOrder = Math.min(HORA_TOTAL - 1, Math.floor(gHora));
  const week = HORA_WEEK[gr]!;
  const rulerKey = horaRulerAt(gr, gii);
  const ruler = HORA_PLANETS[rulerKey];
  const [mx, my] = horaPol(horaRingOuter(gr) + 5, gi * HORA_SEG);
  const [dx0, dy0] = horaPol(HORA_R_HUB, 0);
  const [dx1, dy1] = horaPol(HORA_R_OUT0 + 12, 0);
  const progStep = Math.min(PROG_STEPS - 1, Math.round(prog * PROG_STEPS));

  useEffect(() => {
    if (!isToday || scrubG == null || scrubbingRef.current || playing) return;
    const ring = horaRingFromJsDay(new Date().getDay());
    const horaIdx = Math.min(23, Math.floor((scrubG / 60) * 24));
    setProg(horaProgFromRingHora(ring, horaIdx));
  }, [scrubG, isToday, playing]);

  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (playing) {
        setProg((prev) => {
          let next = prev + dt / HORA_WEEK_MS;
          if (next >= 1) next -= 1;
          saveTimerRef.current += dt;
          if (saveTimerRef.current > 800) {
            saveTimerRef.current = 0;
            save(next, true);
          }
          return next;
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, save]);

  const num = (n: number | string) => digits(n);

  const ringNode = (
    <div className="relative mx-auto aspect-[960/900] w-full max-w-[640px]">
      <div className={horaStatusBar} aria-live="polite">
        <div>
          <span className={horaStatusLabel}>{bilingualText(lang, "वार", "Day")}</span>
          <span className={horaStatusVal}>{bilingualText(lang, week.day, week.en)}</span>
        </div>
        <div>
          <span className={horaStatusLabel}>{bilingualText(lang, "होरा", "Hora")}</span>
          <span className={cn(horaStatusVal, "font-num tabular-nums")}>
            {horaPad(gii + 1)} / 24
          </span>
        </div>
        <div>
          <span className={horaStatusLabel}>{bilingualText(lang, "स्वामी", "Lord")}</span>
          <span className={horaStatusVal} style={{ color: ruler.color }}>
            {bilingualText(lang, HORA_DEVA[rulerKey], ruler.en)}
          </span>
        </div>
      </div>

      <svg viewBox="0 0 960 900" className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="hora-hubSun" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#ffe79a" />
            <stop offset="55%" stopColor="#f8b133" />
            <stop offset="100%" stopColor="#e07d12" />
          </radialGradient>
          <radialGradient id="hora-hubHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(246,166,35,.5)" />
            <stop offset="55%" stopColor="rgba(246,166,35,.12)" />
            <stop offset="100%" stopColor="rgba(246,166,35,0)" />
          </radialGradient>
          <filter id="hora-markGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {labelPaths.map((lp) => (
            <path key={lp.id} id={lp.id} d={lp.d} fill="none" />
          ))}
        </defs>

        <line
          x1={dx0}
          y1={dy0}
          x2={dx1}
          y2={dy1}
          stroke="rgba(255,215,10,.32)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />

        {cells.map((c) => {
          const passed = gHora >= c.order;
          const active = c.order === leadOrder;
          const P = HORA_PLANETS[c.planet];
          return (
            <g key={c.order}>
              <path
                d={c.pathD}
                fill={P.color}
                className={horaSeg}
                style={{
                  opacity: passed ? 1 : 0.07,
                  filter: active
                    ? "brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,.22))"
                    : undefined,
                }}
              />
              <line
                className={horaTickline}
                x1={c.tick.x1}
                y1={c.tick.y1}
                x2={c.tick.x2}
                y2={c.tick.y2}
                opacity={0.3}
              />
              {c.label && (
                <g className={horaSegText} style={{ opacity: passed ? 1 : 0 }}>
                  <text
                    textAnchor="middle"
                    fill={c.label.fill}
                    style={{
                      dominantBaseline: "middle",
                      fontSize: `${c.label.fontSize}px`,
                    }}
                  >
                    <textPath href={`#${c.label.pathId}`} startOffset="50%">
                      {c.label.name}
                    </textPath>
                  </text>
                </g>
              )}
            </g>
          );
        })}

        <CompassMarker deg={0} nep="Sūryodaya" en="Sunrise" />
        <CompassMarker deg={90} nep="Madhyāhna" en="Midday" />
        <CompassMarker deg={180} nep="Sūryāsta" en="Sunset" />
        <CompassMarker deg={270} nep="Madhyarāta" en="Midnight" />

        <g>
          <circle cx={HORA_CX} cy={HORA_CY - 30} r={98} fill="url(#hora-hubHalo)" />
          <g stroke="#f6a623" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              const sunR = 27;
              const r1 = sunR + 5;
              const r2 = sunR + 13;
              const cy = HORA_CY - 50;
              return (
                <line
                  key={i}
                  x1={HORA_CX + Math.cos(a) * r1}
                  y1={cy + Math.sin(a) * r1}
                  x2={HORA_CX + Math.cos(a) * r2}
                  y2={cy + Math.sin(a) * r2}
                />
              );
            })}
          </g>
          <circle cx={HORA_CX} cy={HORA_CY - 50} r={27} fill="url(#hora-hubSun)" />
        </g>

        <text className={horaHubDay} x={HORA_CX} y={HORA_CY + 2} textAnchor="middle">
          {bilingualText(lang, week.day, week.en)}
        </text>
        <text className={horaHubRom} x={HORA_CX} y={HORA_CY + 20} textAnchor="middle">
          {bilingualText(lang, week.rom, ruler.en)}
        </text>
        <text className={horaHubNum} x={HORA_CX} y={HORA_CY + 42} textAnchor="middle">
          HORĀ {horaPad(gii + 1)} / 24
        </text>
        <text
          className={horaHubRuler}
          x={HORA_CX}
          y={HORA_CY + 78}
          textAnchor="middle"
          fill={ruler.color}
        >
          {bilingualText(lang, HORA_DEVA[rulerKey], ruler.en)}
        </text>

        <circle cx={mx} cy={my} r={15} fill="var(--brand-gold)" opacity={0.5} filter="url(#hora-markGlow)" />
        <circle cx={mx} cy={my} r={10} fill="none" stroke="var(--brand-gold)" strokeWidth="2.4" />
        <circle cx={mx} cy={my} r={6} fill="#fff" />
      </svg>
    </div>
  );

  const controlRail = (
    <div
      className={cn(
        horaControlRail,
        expanded && "h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)]",
      )}
    >
      <button
        type="button"
        className={horaControlBtn}
        title={expanded ? bilingualText(lang, "सामान्य दृश्य", "Exit fullscreen") : bilingualText(lang, "पूर्ण स्क्रिन", "Fullscreen")}
        aria-pressed={expanded}
        onClick={toggleExpanded}
      >
        {expanded ? <Minimize2 className="size-4" strokeWidth={2} /> : <Fullscreen className="size-4" strokeWidth={2} />}
      </button>

      <button
        type="button"
        className={horaPlayBtn}
        aria-label={playing ? bilingualText(lang, "रोक्नुहोस्", "Pause") : bilingualText(lang, "चलाउनुहोस्", "Play")}
        onClick={() => {
          const next = !playing;
          setPlaying(next);
          save(prog, next);
        }}
      >
        {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
      </button>

      <div className="relative flex min-h-0 w-full flex-1 items-stretch justify-center py-0.5">
        <div className="pointer-events-none absolute inset-x-1 inset-y-0">
          {Array.from({ length: HORA_NRINGS - 1 }, (_, i) => (
            <span
              key={i}
              className="absolute left-0 right-0 h-px bg-foreground/25 dark:bg-white/25"
              style={{ top: `${((i + 1) / HORA_NRINGS) * 100}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={PROG_STEPS - 1}
          step={1}
          value={progStep}
          aria-label={bilingualText(lang, "हप्ता होरा स्लाइडर", "Week hora slider")}
          className={horaVerticalScrub}
          style={{ "--fill": `${prog * 100}%` } as React.CSSProperties}
          onPointerDown={() => {
            scrubbingRef.current = true;
            setPlaying(false);
            save(prog, false);
          }}
          onPointerUp={() => {
            scrubbingRef.current = false;
          }}
          onPointerCancel={() => {
            scrubbingRef.current = false;
          }}
          onChange={(e) => {
            const next = Math.min(0.99999, Math.max(0, Number(e.target.value) / PROG_STEPS));
            setProg(next);
            save(next, false);
          }}
        />
      </div>

      <span className="shrink-0 text-center font-num text-sm font-semibold tabular-nums leading-tight dark:text-[var(--hora-ink-faint)]">
        {num(gr + 1)}
        <span className="dark:text-[var(--hora-ink-faint)]/70">/7</span>
      </span>
    </div>
  );

  const wheelNode = (
    <div className={cn(horaTheme, patroWheelShell, expanded && horaExpandedShell)}>
      <div className={cn(horaStage, expanded && "min-h-[100dvh]")}>
        <div className={horaGlowTeal} />
        <div className={horaGlowViolet} />
        <div className={horaGlowAmber} />
        <div className={horaGridBg} />

        <div
          className={cn(
            "relative z-[2] flex min-h-[560px] pr-14 max-sm:pr-12",
            expanded && "min-h-[100dvh]",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col items-center gap-6 overflow-y-auto px-4 py-6 text-center max-sm:gap-4 max-sm:px-3 max-sm:py-4">
            {!expanded ? (
              <div className="w-full max-w-[640px]">
                <div className="flex items-center justify-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-secondary before:h-px before:w-[22px] before:bg-secondary/70 before:content-[''] dark:text-[var(--hora-yellow)] dark:before:bg-[var(--hora-yellow)]/70">
                  {bilingualText(lang, "होरा · ग्रहीय होरा", "Hora · Planetary Hours")}
                </div>
                <h2 className="mt-3.5 text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight text-foreground dark:text-[var(--hora-ink)]">
                  {bilingualText(lang, "एक हप्ता,", "One week,")}
                  <br />
                  <span className="text-secondary dark:text-[var(--hora-yellow)]">
                    {bilingualText(lang, "निरन्तर होरा", "unbroken hora")}
                  </span>
                </h2>
                {bilingualNode(lang, <p className="mx-auto mt-3.5 max-w-[600px] text-sm leading-relaxed dark:text-[var(--hora-ink-dim)] [&_em]:italic [&_em]:text-foreground dark:[&_em]:text-[var(--hora-ink)] [&_span]:font-semibold [&_span]:text-foreground dark:[&_span]:text-[var(--hora-ink)]">
                    हरेक वलय एउटै दिन हो — सात ग्रहले पालो–पालोमा शासन गर्ने चौबीस{" "}
                    <em>होरा</em>। सूर्योदयपछिको <em>पहिलो</em> होराको ग्रहले दिनको नाम दिन्छ। गणना
                    कहिल्यै रोकिँदैन: <span>आइतबार</span>को अन्तिम होरा <span>सोम</span>मा गुड्छ र{" "}
                    <span>सोमबार</span> खोल्छ। केन्द्रबाट बाहिरतिर — <span>आदित्य → शनि</span> —
                    हप्ताभरि सर्पिल अनुसरण गर्नुहोस्।
                  </p>,
                  <p className="mx-auto mt-3.5 max-w-[600px] text-sm leading-relaxed dark:text-[var(--hora-ink-dim)] [&_em]:italic [&_em]:text-foreground dark:[&_em]:text-[var(--hora-ink)] [&_span]:font-semibold [&_span]:text-foreground dark:[&_span]:text-[var(--hora-ink)]">
                    Each ring is one day — twenty-four <em>horas</em> ruled in turn by the seven
                    planets. The planet of the <em>first</em> hora after sunrise gives the day its
                    name. The count never stops: the last hora of <span>Sunday</span> rolls into{" "}
                    <span>Monday</span> and opens <span>Monday</span>. Follow the spiral from the
                    centre outward — <span>Sun → Saturn</span> — across the week.
                  </p>,
                )}
              </div>
            ) : null}

            {ringNode}

            <div className="w-full max-w-[440px] text-left">
              <div className="mb-2.5 text-center text-sm font-semibold uppercase tracking-[0.18em] dark:text-[var(--hora-ink-faint)]">
                {bilingualText(lang, "सात दिन · भित्र → बाहिर", "Seven days · inner → outer")}
              </div>
              {HORA_WEEK.map((w, i) => {
                const P = HORA_PLANETS[w.ruler];
                return (
                  <div className="flex items-center gap-2.5 py-1.5" key={w.day}>
                    <span className="w-5 shrink-0 text-center text-sm font-semibold font-num dark:text-[var(--hora-ink-faint)]">
                      {i + 1}
                    </span>
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center">
                      <PlanetIcon planet={w.ruler} size={30} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="font-semibold text-foreground dark:text-[var(--hora-ink)]">
                        {bilingualText(lang, w.day, w.en)}
                      </span>
                      <span className="text-sm dark:text-[var(--hora-ink-faint)]">
                        {bilingualText(lang, `${w.rom} · ${HORA_DEVA[w.ruler]} ${P.nep}`, `${P.en} · ${P.nep}`)}
                      </span>
                    </span>
                    <span className="h-[7px] w-[38px] shrink-0 rounded-full" style={{ background: P.color }} />
                  </div>
                );
              })}
            </div>
          </div>

          {controlRail}
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn(expanded && "min-h-[min(90vh,960px)]")}>
      {expanded ? createPortal(wheelNode, document.body) : wheelNode}
    </div>
  );
}
