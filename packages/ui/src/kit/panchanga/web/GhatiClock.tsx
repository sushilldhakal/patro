import { createElement } from "react";
import { useGhatiClock } from "@vedic-patro/features/panchanga";
import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { moonIcon, sunriseIcon } from "../icons";

export type GhatiClockProps = {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
};

function InkIcon({ node }: { node: typeof sunriseIcon }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {node.map(([tag, attrs], i) => {
        const { key: _key, ...rest } = attrs as Record<string, string | number>;
        return createElement(tag, { key: i, ...rest });
      })}
    </svg>
  );
}

export function GhatiClock({ sunrise, sunset, timezone }: GhatiClockProps) {
  const { vedic, civil, copy } = useGhatiClock({ sunrise, timezone });
  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-ill-wheel-sky2 px-4 pb-4 pt-5 text-center text-ill-brand-off-white shadow-lg">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `linear-gradient(${withAlpha(neutral.white, 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(neutral.white, 0.05)} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: `radial-gradient(circle at 50% 0%, ${neutral.black} 30%, transparent 80%)`,
        }}
      />
      <div
        className="absolute -right-16 -top-24 -z-20 h-60 w-60 rounded-full blur-[46px]"
        style={{ background: `radial-gradient(circle, ${withAlpha(illustration.teal25, 0.45)}, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-28 -left-12 -z-20 h-52 w-52 rounded-full blur-[46px]"
        style={{ background: `radial-gradient(circle, ${withAlpha(illustration.amber52, 0.2)}, transparent 70%)` }}
      />
      <div className="text-sm font-semibold tracking-eyebrow-wide text-ill-brand-off-white/55">{copy.title}</div>
      <div className="mt-3.5 font-mono text-5xl font-bold leading-none tracking-tight tabular-nums">
        {vedic.ghati}
        <span className="text-ill-brand-off-white/40">:</span>
        {vedic.pala}
        <span className="text-ill-brand-off-white/40">:</span>
        <span className="text-sm text-ill-brand-off-white/65">{vedic.vipala}</span>
      </div>
      <div className="mt-2 text-sm font-semibold tracking-wide text-panchang">{copy.vedicUnits}</div>
      <div className="mx-5 my-3.5 h-px bg-white/12" />
      <div className="font-mono text-xl font-bold leading-none tabular-nums">
        {civil.hour}:{civil.minute}
        <span className="text-sm text-ill-brand-off-white/65">:{civil.second}</span>
      </div>
      <div className="mt-2 text-sm font-semibold tracking-wide text-ill-brand-off-white/50">{copy.civilUnits}</div>
      <div className="mt-3.5 flex justify-center gap-4 font-mono text-sm text-ill-brand-off-white/80">
        {sunrise ? (
          <span className="inline-flex items-center gap-1.5">
            <InkIcon node={sunriseIcon} />
            {sunrise}
          </span>
        ) : null}
        {sunset ? (
          <span className="inline-flex items-center gap-1.5">
            <InkIcon node={moonIcon} />
            {sunset}
          </span>
        ) : null}
      </div>
    </div>
  );
}
