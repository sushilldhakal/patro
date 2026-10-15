import { Sunrise, Moon } from "lucide-react";
import { useGhatiClock } from "@vedic-patro/features/panchanga";
import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";

interface Props {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
}

export function GhatiClock({ sunrise, sunset, timezone }: Props) {
  const { vedic, civil, copy } = useGhatiClock({ sunrise, timezone });

  return (
    <div className="relative overflow-hidden isolate text-center rounded-xl px-4 pt-5 pb-4 bg-ill-wheel-sky2 text-ill-brand-off-white shadow-lg">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `linear-gradient(${withAlpha(neutral.white, 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(neutral.white, 0.05)} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: `radial-gradient(circle at 50% 0%, ${neutral.black} 30%, transparent 80%)`,
        }}
      />
      <div
        className="absolute -z-20 w-60 h-60 -top-24 -right-16 rounded-full blur-[46px]"
        style={{ background: `radial-gradient(circle, ${withAlpha(illustration.teal25, 0.45)}, transparent 70%)` }}
      />
      <div
        className="absolute -z-20 w-52 h-52 -bottom-28 -left-12 rounded-full blur-[46px]"
        style={{ background: `radial-gradient(circle, ${withAlpha(illustration.amber52, 0.2)}, transparent 70%)` }}
      />

      <div className="text-sm font-semibold tracking-eyebrow-wide text-ill-brand-off-white/55">
        {copy.title}
      </div>
      <div className="font-mono font-bold text-5xl leading-none mt-3.5 tracking-tight tabular-nums">
        {vedic.ghati}
        <span className="text-ill-brand-off-white/40">:</span>
        {vedic.pala}
        <span className="text-ill-brand-off-white/40">:</span>
        <span className="text-sm text-ill-brand-off-white/65">{vedic.vipala}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-panchang mt-2">
        {copy.vedicUnits}
      </div>

      <div className="h-px bg-white/12 mx-5 my-3.5" />

      <div className="font-mono font-bold text-xl leading-none tabular-nums">
        {civil.hour}:{civil.minute}
        <span className="text-sm text-ill-brand-off-white/65">:{civil.second}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-ill-brand-off-white/50 mt-2">
        {copy.civilUnits}
      </div>

      <div className="flex justify-center gap-4 mt-3.5 text-sm font-mono text-ill-brand-off-white/80">
        {sunrise && (
          <span className="inline-flex items-center gap-1.5">
            <Sunrise className="w-3.5 h-3.5" />
            {sunrise}
          </span>
        )}
        {sunset && (
          <span className="inline-flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5" />
            {sunset}
          </span>
        )}
      </div>
    </div>
  );
}
