/** Shared by apps/web/src/components/learn/EotGraph.tsx and apps/mobile/components/learn/playground/EotGraph.tsx (moved here from both, unchanged). */
export type Pt = { t: number; minutes: number };

/** Insert the exact zero-crossing so the late/early fills meet the axis cleanly. */
export function withZeroCrossings(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i]!;
    if (i > 0) {
      const prev = pts[i - 1]!;
      if (prev.minutes * cur.minutes < 0) {
        const u = prev.minutes / (prev.minutes - cur.minutes);
        out.push({ t: prev.t + u * (cur.t - prev.t), minutes: 0 });
      }
    }
    out.push(cur);
  }
  return out;
}

export function formatDuration(sec: number, num: (v: number | string) => string): string {
  if (Math.abs(sec) < 30) return `${num(0)}s`;
  const sign = sec < 0 ? "−" : "";
  const n = Math.abs(sec);
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n - hours * 3600) / 60);
  if (hours !== 0) return `${sign}${num(hours)}h${minutes ? `${num(minutes)}m` : ""}`;
  return `${sign}${num(minutes)}m`;
}
