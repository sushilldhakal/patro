import { useEffect, useMemo, useState } from "react";
import { Sunrise, Moon } from "lucide-react";
import { getZonedTimeParts, minutesSinceMidnightInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@/i18n/locale";
import { parseTimeToMinutes } from "@vedic-patro/domain/ghati-clock";

import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface Props {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
}

export function GhatiClock({ sunrise, sunset, timezone }: Props) {
  const { lang, digits } = useLocale();
  const [now, setNow] = useState(() => new Date());
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 200);
    return () => clearInterval(id);
  }, []);

  const { hour: hh, minute: mm, second: ss } = useMemo(
    () => getZonedTimeParts(now, timeZone),
    [now, timeZone]
  );

  const sunriseMin = parseTimeToMinutes(sunrise) ?? 5 * 60 + 12;
  const minsNow = minutesSinceMidnightInTimezone(now, timeZone, true);
  let vg = (minsNow - sunriseMin) / 24;
  if (vg < 0) vg += 60;
  const gh = Math.floor(vg);
  const pa = Math.floor((vg - gh) * 60);
  const vi = Math.floor(((vg - gh) * 60 - pa) * 60);

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
        {tFor(lang, "panchanga.vedic_time")}
      </div>
      <div className="font-mono font-bold text-5xl leading-none mt-3.5 tracking-tight tabular-nums">
        {digits(pad2(gh))}
        <span className="text-ill-brand-off-white/40">:</span>
        {digits(pad2(pa))}
        <span className="text-ill-brand-off-white/40">:</span>
        <span className="text-sm text-ill-brand-off-white/65">{digits(pad2(vi))}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-panchang mt-2">
        {tFor(lang, "panchanga.ghati_pala_vipala")}
      </div>

      <div className="h-px bg-white/12 mx-5 my-3.5" />

      <div className="font-mono font-bold text-xl leading-none tabular-nums">
        {digits(pad2(hh))}:{digits(pad2(mm))}
        <span className="text-sm text-ill-brand-off-white/65">:{digits(pad2(ss))}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-ill-brand-off-white/50 mt-2">
        {tFor(lang, "panchanga.hour_minute")}
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
