/**
 * Stellarium-style time sheet over the 3D sky: wall-clock steppers, a bipolar
 * ×10000 rate slider, previous/next night, jump-to-now, and a daylight scrub.
 *
 * Drawn in-tree (not portalled) so it still paints inside the Fullscreen API
 * layer — the same constraint {@link SkyDateTimePicker} was written around.
 *
 * Nepali UI steps विक्रम संवत् year / month / day. English UI keeps Gregorian.
 */

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { RATE_NOTCHES, rateToSlider, sliderToRate } from "@/lib/sky3d/rate-slider";
import { cn } from "@vedic-patro/domain/utils";
import { effect, illustration, midnight, wheel } from "@vedic-patro/design-tokens";
import { SKY_TIME_FIELDS, useSkyTimeSheet, type SkyTimeField, type SkyTimeFieldView, type SkyTimeTransport } from "@vedic-patro/features/sky3d";
export { type WallParts } from "@vedic-patro/domain/sky3d/sky-time";

/** बिहान → दिउँसो → सन्ध्या → जूनकिरण → मध्यरात. */
const DAYLIGHT_GRADIENT =
  "linear-gradient(90deg," +
  `${illustration.amber66} 0%,` +
  `${illustration.sky80} 14%,` +
  `${illustration.sky68} 28%,` +
  `${illustration.sky75b} 40%,` +
  `${midnight.saffron} 50%,` +
  `${illustration.orange54} 58%,` +
  `${illustration.violet33} 66%,` +
  `${illustration.sky19} 74%,` +
  `${illustration.sky70} 80%,` +
  `${midnight.background} 88%,` +
  `${wheel.sky2} 96%,` +
  `${illustration.violet24} 100%)`;

const JUMP_ICONS: Record<"prev" | "now" | "next", ReactNode> = {
  prev: <SkipBack className="size-6" />,
  now: <History className="size-6" />,
  next: <SkipForward className="size-6" />,
};

type Props = {
  timeMs: number;
  zoneOffsetMs: number;
  /** The speed controls show only when the sheet is given the rate and its handlers (the 3D sky); the wheel's date dialog has none. */
  timeRate?: number;
  onClose: () => void;
  onApplyMs: (ms: number) => void;
  onTimeRate?: (rate: number) => void;
  onTogglePlay?: () => void;
  onResetRate?: () => void;
  /** The same speed row for a clock that runs on its own ladder (the wheel's year playback): rung −max..max, 0 paused. */
  transport?: SkyTimeTransport;
  /** A card in the middle of the screen instead of a sheet at the bottom (the wheel's date dialog). */
  centered?: boolean;
};

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  timeRate,
  onClose,
  onApplyMs,
  onTimeRate,
  onTogglePlay,
  onResetRate,
  centered = false,
  transport: transportProp,
}: Props) {
  const v = useSkyTimeSheet({ timeMs, zoneOffsetMs, timeRate: timeRate ?? 0, onApplyMs });
  const transport: (SkyTimeTransport & { playing: boolean }) | null = transportProp
    ? { ...transportProp, playing: transportProp.rung !== 0 }
    : timeRate !== undefined && onTimeRate && onTogglePlay && onResetRate
      ? {
          rung: Math.round(rateToSlider(timeRate)),
          max: RATE_NOTCHES,
          label: v.speedLabel,
          playing: v.playing,
          onRung: (n) => onTimeRate(sliderToRate(n)),
          onTogglePlay,
          onReset: onResetRate,
        }
      : null;
  const inputRefs = useRef<Partial<Record<SkyTimeField, HTMLInputElement | null>>>({});

  const focusField = (field: SkyTimeField) => {
    v.startEdit(field);
    requestAnimationFrame(() => inputRefs.current[field]?.select());
  };

  const onFieldKey = (field: SkyTimeField, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      v.commitField(field, v.draft);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      v.endEdit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      v.step(field, 1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      v.step(field, -1);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      v.commitField(field, v.draft);
      const i = SKY_TIME_FIELDS.indexOf(field);
      const next = SKY_TIME_FIELDS[i + (e.shiftKey ? -1 : 1)];
      if (next) focusField(next);
    }
  };

  const stepper = (f: SkyTimeFieldView) => (
    <Stepper
      key={f.field}
      f={f}
      inputRef={(el) => {
        inputRefs.current[f.field] = el;
      }}
      onStartEdit={() => focusField(f.field)}
      onDraft={(raw) => v.setDraft(f.field, raw)}
      onCommit={(raw) => v.commitField(f.field, raw)}
      onKey={onFieldKey}
    />
  );

  const withSeps = (fields: SkyTimeFieldView[], glyph: string) =>
    fields.flatMap((f, i) => (i === 0 ? [stepper(f)] : [<Sep key={`sep-${f.field}`}>{glyph}</Sep>, stepper(f)]));

  return (
    <div className={cn("absolute inset-0 z-50 flex flex-col", centered ? "justify-center px-3" : "justify-end")}>
      <button
        type="button"
        aria-label={v.labels.close}
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={onClose}
      />
      <div
        data-sky-controls
        className={cn(
          "relative mx-auto w-full max-w-lg border border-white/12 bg-ill-gray11/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-white backdrop-blur-md",
          centered ? "rounded-3xl" : "rounded-t-3xl",
        )}
        style={{ boxShadow: effect.sheetLift }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30" />

        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-0.5">{withSeps(v.dateFields, "/")}</div>
          <div className="flex items-center gap-0.5">{withSeps(v.clockFields, ":")}</div>
        </div>

        {transport ? (
          <>
            <p className="mt-4 mb-1 min-h-5 text-center text-sm font-semibold tracking-wide text-white/90">{transport.label}</p>
            <div className="flex items-center gap-2">
              <IconRound label={transport.playing ? v.labels.pause : v.labels.play} onPress={transport.onTogglePlay}>
                {transport.playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
              </IconRound>
              <input
                type="range"
                min={-transport.max}
                max={transport.max}
                step={1}
                value={transport.rung}
                aria-label={v.labels.rate}
                className="sky-time-slider sky-time-slider--thin min-w-0 flex-1"
                onChange={(e) => transport.onRung(Number(e.target.value))}
              />
              <IconRound label={v.labels.realtime} onPress={transport.onReset}>
                <RotateCcw className="size-5" />
              </IconRound>
            </div>
          </>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {v.jumps.map((jump) => (
            <NavAction key={jump.id} icon={JUMP_ICONS[jump.id]} label={jump.label} onPress={jump.run} />
          ))}
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={86_399}
            step={1}
            value={v.daySlider}
            aria-label={v.labels.daylight}
            className="sky-time-slider sky-time-slider--day w-full"
            onChange={(e) => v.setDaySlider(Number(e.target.value))}
          />
          <div className="relative mt-1.5 h-4">
            {v.dayPeriods.map((band) => {
              const active = band.active;
              const edge = band.at <= 8 ? "left" : band.at >= 88 ? "right" : "center";
              return (
                <span
                  key={band.id}
                  className={cn(
                    "absolute top-0 text-diagram-xs leading-none whitespace-nowrap",
                    active ? "font-semibold text-white" : "font-medium text-white/55",
                    edge === "left" && "left-0",
                    edge === "right" && "right-0",
                    edge === "center" && "-translate-x-1/2",
                  )}
                  style={edge === "center" ? { left: `${band.at}%` } : undefined}
                >
                  {band.label}
                </span>
              );
            })}
          </div>
        </div>

        <style>{`
          .sky-time-slider--day {
            height: 32px;
          }
          .sky-time-slider--day::-webkit-slider-runnable-track {
            height: 14px;
            border-radius: 999px;
            background: ${DAYLIGHT_GRADIENT};
          }
          .sky-time-slider--day::-moz-range-track {
            height: 14px;
            border-radius: 999px;
            background: ${DAYLIGHT_GRADIENT};
          }
          .sky-time-slider--day::-webkit-slider-thumb {
            margin-top: -2px;
            background: ${illustration.amber92};
            box-shadow: ${effect.thumbRing};
          }
          .sky-time-slider--day::-moz-range-thumb {
            background: ${illustration.amber92};
          }
        `}</style>
      </div>
    </div>
  );
}

function Sep({ children }: { children: string }) {
  return (
    <span className="pointer-events-none w-2.5 shrink-0 text-center text-lg font-semibold leading-none text-white/80 xs:text-xl">
      {children}
    </span>
  );
}

function Stepper({
  f,
  inputRef,
  onStartEdit,
  onDraft,
  onCommit,
  onKey,
}: {
  f: SkyTimeFieldView;
  inputRef: (el: HTMLInputElement | null) => void;
  onStartEdit: () => void;
  onDraft: (v: string) => void;
  onCommit: (value: string) => void;
  onKey: (field: SkyTimeField, e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={cn("flex flex-col items-center", f.wide ? "w-12" : "w-8")}>
      <HoldButton label={f.upLabel} onStep={f.up}>
        <ChevronUp className="size-4 text-white" strokeWidth={2.5} />
      </HoldButton>
      <input
        ref={inputRef}
        value={f.value}
        inputMode={f.allowMinus ? "text" : "numeric"}
        enterKeyHint="next"
        autoComplete="off"
        aria-label={f.label}
        className="w-full bg-transparent p-0 text-center text-lg font-semibold tabular-nums leading-none text-white outline-none xs:text-xl caret-white"
        onFocus={onStartEdit}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => onKey(f.field, e)}
      />
      <HoldButton label={f.downLabel} onStep={f.down}>
        <ChevronDown className="size-4 text-white" strokeWidth={2.5} />
      </HoldButton>
    </div>
  );
}

function HoldButton({
  label,
  onStep,
  children,
}: {
  label: string;
  onStep: () => void;
  children: ReactNode;
}) {
  const hold = useRef(0);
  const repeat = useRef(0);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const stop = () => {
    window.clearTimeout(hold.current);
    window.clearInterval(repeat.current);
    hold.current = 0;
    repeat.current = 0;
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md text-white/90 hover:bg-white/10 active:bg-white/20"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onStepRef.current();
        hold.current = window.setTimeout(() => {
          repeat.current = window.setInterval(() => onStepRef.current(), 70);
        }, 380);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
    >
      {children}
    </button>
  );
}

function IconRound({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function NavAction({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-white hover:bg-white/8"
    >
      {icon}
      <span className="text-center text-xs font-medium leading-tight text-white/90">{label}</span>
    </button>
  );
}
