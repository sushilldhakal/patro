import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { effect, illustration } from "@vedic-patro/design-tokens";
import { daylightGradient } from "@vedic-patro/design-tokens/classes/learn/daylight-stops";
import { cn } from "@vedic-patro/domain/utils";
import { SKY_TIME_FIELDS, skySheetTransport, useSkyTimeSheet, type SkyTimeField, type SkyTimeFieldView } from "@vedic-patro/features/sky3d";
import type { SkyTimeSheetProps } from "../contract";

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  timeRate,
  onClose,
  onApplyMs,
  onTimeRate,
  onTogglePlay,
  onResetRate,
  transport: transportProp,
  centered = false,
  icons,
}: SkyTimeSheetProps) {
  const v = useSkyTimeSheet({ timeMs, zoneOffsetMs, timeRate: timeRate ?? 0, onApplyMs });
  const transport = skySheetTransport({
    timeRate,
    onTimeRate,
    onTogglePlay,
    onResetRate,
    transport: transportProp,
    speedLabel: v.speedLabel,
    playing: v.playing,
  });
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
    <div key={f.field} className={cn("flex flex-col items-center", f.wide ? "w-12" : "w-8")}>
      <HoldButton label={f.upLabel} onStep={f.up}>
        {icons.up}
      </HoldButton>
      <input
        ref={(el) => {
          inputRefs.current[f.field] = el;
        }}
        value={f.value}
        inputMode={f.allowMinus ? "text" : "numeric"}
        enterKeyHint="next"
        autoComplete="off"
        aria-label={f.label}
        className="w-full bg-transparent p-0 text-center text-lg font-semibold tabular-nums leading-none text-white outline-none caret-white xs:text-xl"
        onFocus={() => focusField(f.field)}
        onChange={(e) => v.setDraft(f.field, e.target.value)}
        onBlur={(e) => v.commitField(f.field, e.currentTarget.value)}
        onKeyDown={(e) => onFieldKey(f.field, e)}
      />
      <HoldButton label={f.downLabel} onStep={f.down}>
        {icons.down}
      </HoldButton>
    </div>
  );

  const withSeps = (fields: SkyTimeFieldView[], glyph: string) =>
    fields.flatMap((f, i) =>
      i === 0
        ? [stepper(f)]
        : [
            <span key={`sep-${f.field}`} className="pointer-events-none w-2.5 shrink-0 text-center text-lg font-semibold leading-none text-white/80 xs:text-xl">
              {glyph}
            </span>,
            stepper(f),
          ],
    );

  return (
    <div className={cn("absolute inset-0 z-50 flex flex-col", centered ? "justify-center px-3" : "justify-end")}>
      <button type="button" aria-label={v.labels.close} className="absolute inset-0 cursor-default bg-black/40" onClick={onClose} />
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
            <p className="mb-1 mt-4 min-h-5 text-center text-sm font-semibold tracking-wide text-white/90">{transport.label}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={transport.playing ? v.labels.pause : v.labels.play}
                onClick={transport.onTogglePlay}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
              >
                {transport.playing ? icons.pause : icons.play}
              </button>
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
              <button
                type="button"
                aria-label={v.labels.realtime}
                onClick={transport.onReset}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
              >
                {icons.reset}
              </button>
            </div>
          </>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {v.jumps.map((jump) => (
            <button
              key={jump.id}
              type="button"
              onClick={jump.run}
              className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-white hover:bg-white/8"
            >
              {icons[jump.id]}
              <span className="text-center text-xs font-medium leading-tight text-white/90">{jump.label}</span>
            </button>
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
              const edge = band.at <= 8 ? "left" : band.at >= 88 ? "right" : "center";
              return (
                <span
                  key={band.id}
                  className={cn(
                    "absolute top-0 whitespace-nowrap text-diagram-xs leading-none",
                    band.active ? "font-semibold text-white" : "font-medium text-white/55",
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
        {/* One rule per engine: a selector list holding an unknown pseudo-element
            is dropped whole, so a shared -webkit-/-moz- rule drew no track anywhere. */}
        <style>{`
          .sky-time-slider--day { height: 32px; }
          .sky-time-slider--day::-webkit-slider-runnable-track {
            height: 14px;
            border-radius: 999px;
            background: ${daylightGradient()};
          }
          .sky-time-slider--day::-moz-range-track {
            height: 14px;
            border-radius: 999px;
            background: ${daylightGradient()};
          }
          .sky-time-slider--day::-webkit-slider-thumb { margin-top: -2px; background: ${illustration.amber92}; box-shadow: ${effect.thumbRing}; }
          .sky-time-slider--day::-moz-range-thumb { background: ${illustration.amber92}; }
        `}</style>
      </div>
    </div>
  );
}

function HoldButton({ label, onStep, children }: { label: string; onStep: () => void; children: ReactNode }) {
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
