import { useEffect, useMemo, useState } from "react";
import { Sunrise, Moon } from "lucide-react";
import { getZonedTimeParts, minutesSinceMidnightInTimezone } from "@/lib/zoned-time";
import { useLocale, bilingualText } from "@/i18n/locale";

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

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
    <div className="relative overflow-hidden isolate text-center rounded-xl px-4 pt-5 pb-4 bg-[#07080d] text-[#f5f5f1] shadow-lg">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 0%, #000 30%, transparent 80%)",
        }}
      />
      <div
        className="absolute -z-20 w-60 h-60 -top-24 -right-16 rounded-full blur-[46px]"
        style={{ background: "radial-gradient(circle, rgba(0,105,111,0.45), transparent 70%)" }}
      />
      <div
        className="absolute -z-20 w-52 h-52 -bottom-28 -left-12 rounded-full blur-[46px]"
        style={{ background: "radial-gradient(circle, rgba(255,215,10,0.20), transparent 70%)" }}
      />

      <div className="text-sm font-semibold tracking-[0.16em] text-[#f5f5f1]/55">
        {bilingualText(lang, "वैदिक समय", "Vedic time")}
      </div>
      <div className="font-mono font-bold text-5xl leading-none mt-3.5 tracking-tight tabular-nums">
        {digits(pad2(gh))}
        <span className="text-[#f5f5f1]/40">:</span>
        {digits(pad2(pa))}
        <span className="text-[#f5f5f1]/40">:</span>
        <span className="text-sm text-[#f5f5f1]/65">{digits(pad2(vi))}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-panchang mt-2">
        {bilingualText(lang, "घडी : पला : विपला", "Ghati : Pala : Vipala")}
      </div>

      <div className="h-px bg-white/12 mx-5 my-3.5" />

      <div className="font-mono font-bold text-xl leading-none tabular-nums">
        {digits(pad2(hh))}:{digits(pad2(mm))}
        <span className="text-sm text-[#f5f5f1]/65">:{digits(pad2(ss))}</span>
      </div>
      <div className="text-sm font-semibold tracking-wide text-[#f5f5f1]/50 mt-2">
        {bilingualText(lang, "घण्टा : मिनेट", "Hour : Minute")}
      </div>

      <div className="flex justify-center gap-4 mt-3.5 text-sm font-mono text-[#f5f5f1]/80">
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
