import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pause, Play } from "lucide-react";
import { brand, illustration, midnight } from "@vedic-patro/design-tokens";
import { useTranslation } from "@vedic-patro/i18n/react";
import {
  northernSummer,
  perihelionAngle,
  perihelionDate,
  solsticeSunlight,
} from "@vedic-patro/domain/learn/apsidal-precession";
import { eccentricAnomaly } from "@vedic-patro/domain/learn/kepler";
import { edScrub } from "@/lib/diagram-classes";
import {
  edControls,
  edPlayBtn,
  edPreset,
  edPresets,
  edReadout,
  edRo,
  edRoK,
  edRoV,
  edScrubWrap,
  motSliderLabel,
  motSliderRow,
  tmCardCap,
  tmCardPadLg,
} from "@/lib/learn-classes";
import { useLocaleDigits } from "@/i18n/digits";

/**
 * Perihelion (उपसौर) and aphelion (अपसौर) against the seasons, in 3D.
 *
 * The solstice line is set by Earth's tilted axis and stays put here; the
 * orbit's oval — and so perihelion and aphelion — turns once in ~21,000 years.
 * Earth keeps running round the year on top, quick near perihelion and slow
 * near aphelion. The app draws the same scene (apps/mobile ApsidesScene) from
 * the same shared numbers.
 */

const CANVAS_BG = midnight.popover;
const C = {
  sun: illustration.amber67,
  orbit: illustration.sky61,
  faint: illustration.sky32b,
  peri: illustration.orange61,
  aph: illustration.sky75b,
  earth: illustration.sky60,
  axis: illustration.sky75b,
  ray: illustration.amber56,
  label: brand.offWhite,
};
const RAD = Math.PI / 180;
const DRAWN_E = 0.28;
const YEAR_SECONDS = 7;
const STATION_R = 1.55;
const TILT = 23.44;
const MIN_YEAR = -10000;
const MAX_YEAR = 14000;
const SPEED = 1400; // years per second while playing
const MONTH_KEYS = [
  "kundali.x.month_january", "kundali.x.month_february", "kundali.x.month_march", "kundali.x.month_april",
  "kundali.x.month_may", "kundali.x.month_june", "kundali.x.month_july", "kundali.x.month_august",
  "kundali.x.month_september", "kundali.x.month_october", "kundali.x.month_november", "kundali.x.month_december",
] as const;

/** Seasonal angle (0 = December solstice, in Earth's direction of travel) → scene point. */
function seasonal(angleDeg: number, r: number, y = 0): THREE.Vector3 {
  return new THREE.Vector3(r * Math.cos(angleDeg * RAD), y, -r * Math.sin(angleDeg * RAD));
}

const UP = new THREE.Vector3(0, 1, 0);
const CAMERA_DIR = new THREE.Vector3(0.3, 1.05, 1).normalize();
/** Per-frame scratch vector (one scene per page, so sharing it is safe). */
const SCRATCH = new THREE.Vector3();

type LabelId = "sun" | "peri" | "aph" | "st0" | "st1" | "st2" | "st3";
type LabelPositions = Partial<Record<LabelId, { x: number; y: number }>>;

function Scene({
  yearRef,
  onLabels,
}: {
  yearRef: React.MutableRefObject<number>;
  onLabels: (positions: LabelPositions) => void;
}) {
  const frame = useRef(0);
  const orbitRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const rayRef = useRef<THREE.Mesh>(null);
  const mean = useRef(0);
  const rPeri = 1 - DRAWN_E;
  const rAph = 1 + DRAWN_E;

  const orbitGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 160; i++) {
      const nu = (i / 160) * Math.PI * 2;
      const r = (1 - DRAWN_E * DRAWN_E) / (1 + DRAWN_E * Math.cos(nu));
      pts.push(new THREE.Vector3(r * Math.cos(nu), 0, -r * Math.sin(nu)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 320, 0.006, 6, true);
  }, []);
  const stations = useMemo(() => [0, 90, 180, 270].map((a) => seasonal(a, STATION_R, 0.02)), []);

  const fitted = useRef("");

  useFrame((state, dt) => {
    const { camera, size } = state;
    /* Back the camera off on narrow (phone) canvases so the whole year ring stays in frame. */
    const key = `${size.width}x${size.height}`;
    if (fitted.current !== key) {
      fitted.current = key;
      const aspect = size.width / Math.max(size.height, 1);
      const d = Math.max(3.6, 1.95 / (Math.tan((45 / 2) * RAD) * aspect));
      camera.position.copy(CAMERA_DIR).multiplyScalar(d);
      camera.lookAt(0, 0, 0);
    }
    const positions: LabelPositions = {};
    const place = (id: LabelId, p: THREE.Vector3) => {
      SCRATCH.copy(p).project(camera);
      positions[id] = { x: ((SCRATCH.x + 1) / 2) * size.width, y: ((1 - SCRATCH.y) / 2) * size.height };
    };

    const peri = perihelionAngle(yearRef.current);
    if (orbitRef.current) orbitRef.current.rotation.y = peri * RAD;

    mean.current = (mean.current + (Math.min(dt, 0.1) / YEAR_SECONDS) * Math.PI * 2) % (Math.PI * 2);
    const E = eccentricAnomaly(mean.current, DRAWN_E);
    const nu = 2 * Math.atan2(Math.sqrt(1 + DRAWN_E) * Math.sin(E / 2), Math.sqrt(1 - DRAWN_E) * Math.cos(E / 2));
    const r = (1 - DRAWN_E * DRAWN_E) / (1 + DRAWN_E * Math.cos(nu));
    const earth = seasonal(peri + nu / RAD, r);
    earthRef.current?.position.copy(earth);
    if (rayRef.current) {
      rayRef.current.position.copy(earth).multiplyScalar(0.5);
      rayRef.current.scale.set(1, earth.length(), 1);
      rayRef.current.quaternion.setFromUnitVectors(UP, SCRATCH.copy(earth).normalize());
    }

    place("sun", new THREE.Vector3(0, 0.3, 0));
    place("peri", seasonal(peri, rPeri, 0.14));
    place("aph", seasonal(peri + 180, rAph, 0.14));
    stations.forEach((p, i) => place(`st${i}` as LabelId, p.clone().multiplyScalar(1.12)));
    /* Labels are React text over the canvas; a few updates a second keep them on their anchors. */
    frame.current += 1;
    if (frame.current % 3 === 0) onLabels(positions);
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={3.4} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[0.16, 32, 32]} />
        <meshBasicMaterial color={C.sun} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshBasicMaterial color={C.sun} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Fixed by the axis: the solstice line and the four stations of the year. */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, STATION_R * 2, 6]} />
        <meshBasicMaterial color={C.sun} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {stations.map((p, i) => (
        <mesh key={i} position={p}>
          <coneGeometry args={[0.03, 0.072, 10]} />
          <meshBasicMaterial color={i % 2 === 0 ? C.sun : C.faint} />
        </mesh>
      ))}

      {/* Turned by apsidal precession: the oval, its long axis and its two ends. */}
      <group ref={orbitRef}>
        <mesh geometry={orbitGeometry}>
          <meshBasicMaterial color={C.orbit} transparent opacity={0.65} depthWrite={false} />
        </mesh>
        <mesh position={[(rPeri - rAph) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.003, rPeri + rAph, 6]} />
          <meshBasicMaterial color={C.peri} transparent opacity={0.6} depthWrite={false} />
        </mesh>
        <mesh position={[rPeri, 0, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={C.peri} />
        </mesh>
        <mesh position={[-rAph, 0, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={C.aph} />
        </mesh>
      </group>

      <mesh ref={rayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={C.ray} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* The axis keeps one direction in space; at the June solstice the north leans sunward. */}
      <group ref={earthRef}>
        <group rotation={[0, 0, -TILT * RAD]}>
          <mesh>
            <sphereGeometry args={[0.1, 32, 32]} />
            <meshStandardMaterial color={C.earth} roughness={0.85} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.003, 0.003, 0.29, 8]} />
            <meshBasicMaterial color={C.axis} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function ApsidesSeasons() {
  const { t } = useTranslation();
  const N = useLocaleDigits();
  const [year, setYear] = useState(2026);
  const [playing, setPlaying] = useState(false);
  const yearRef = useRef(2026);
  const [positions, setPositions] = useState<LabelPositions>({});

  useEffect(() => {
    yearRef.current = year;
  }, [year]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setYear((y) => {
        const next = y + dt * SPEED;
        return next > MAX_YEAR ? MIN_YEAR : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const y = Math.round(year);
  const yearText = y < 1 ? t("learn.apsides.bce", { year: N(1 - y) }) : t("learn.apsides.ce", { year: N(y) });
  const peri = perihelionDate(year);
  const dateText = `${N(peri.day)} ${t(MONTH_KEYS[peri.month]!)}`;
  const june = solsticeSunlight(year).june;
  const summer = northernSummer(year);
  const presets = [
    { label: t("learn.apsides.preset_ice"), value: -9000 },
    { label: t("learn.apsides.preset_aligned"), value: 1250 },
    { label: t("learn.apsides.preset_today"), value: 2026 },
    { label: t("learn.apsides.preset_future"), value: 11750 },
  ];
  const labels: { id: LabelId; text: string; color: string; size: number }[] = [
    { id: "sun", text: t("kundali.report.meta_sun"), color: C.sun, size: 12 },
    { id: "peri", text: t("learn.apsides.perihelion"), color: C.peri, size: 11 },
    { id: "aph", text: t("learn.apsides.aphelion"), color: C.aph, size: 11 },
    { id: "st0", text: t("ui.learn.december_solstice"), color: C.label, size: 10 },
    { id: "st1", text: t("ui.learn.march_equinox"), color: C.label, size: 10 },
    { id: "st2", text: t("ui.learn.june_solstice"), color: C.label, size: 10 },
    { id: "st3", text: t("ui.learn.september_equinox"), color: C.label, size: 10 },
  ];
  const fill = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className={tmCardPadLg}>
      <p className="mb-2 text-sm font-semibold">{t("learn.apsides.title")}</p>
      <div className="relative h-[300px] w-full overflow-hidden rounded-xl sm:h-[380px]" style={{ background: CANVAS_BG }}>
        <Canvas camera={{ position: [0.9, 2.6, 2.6], fov: 45, near: 0.05, far: 100 }} gl={{ antialias: true }} onCreated={({ gl }) => gl.setClearColor(CANVAS_BG)}>
          <Suspense fallback={null}>
            <Scene yearRef={yearRef} onLabels={setPositions} />
          </Suspense>
        </Canvas>
        <div className="pointer-events-none absolute inset-0">
          {labels.map((l) => {
            const at = positions[l.id];
            if (!at) return null;
            return (
              <span
                key={l.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold"
                style={{ left: at.x, top: at.y, color: l.color, fontSize: l.size, textShadow: `0 1px 3px ${CANVAS_BG}` }}
              >
                {l.text}
              </span>
            );
          })}
        </div>
      </div>

      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.year")}</span>
            <span className={edRoV({ mono: true })}>{yearText}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.perihelion_date")}</span>
            <span className={edRoV({ amber: true })}>{dateText}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.june_sun")}</span>
            <span className={edRoV({ mono: true })}>{`${june >= 0 ? "+" : "−"}${N(Math.abs(june).toFixed(1))}%`}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.north_summer")}</span>
            <span className={edRoV({ amber: summer === "intense" })}>{t(`learn.apsides.${summer}`)}</span>
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.apsides.slider", { year: yearText, date: dateText })}</span>
          <div className={edScrubWrap}>
            <button
              type="button"
              className={edPlayBtn}
              onClick={() => setPlaying((p) => !p)}
              title={playing ? t("learn.pause") : t("learn.play")}
              aria-label={playing ? t("learn.pause") : t("learn.play")}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              className={edScrub}
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={50}
              value={year}
              aria-label={t("learn.apsides.year")}
              style={{ "--fill": `${fill}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setYear(+e.target.value);
              }}
            />
          </div>
        </div>

        <div className={edPresets}>
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              className={edPreset(Math.abs(year - p.value) < 200)}
              onClick={() => {
                setPlaying(false);
                setYear(p.value);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className={tmCardCap}>{t("learn.apsides.caption")}</p>
    </div>
  );
}
