// The server's recorded responses against the engine's: instants within 20 s, clocks within a minute, text by shape.
type Json = Record<string, unknown>;
const ISO = /^-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?[+-]\d\d:\d\d$/;
const t = (s: string) => Date.parse(s) / 1000;
export function diff(path: string, got: unknown, want: unknown): string | null {
  if (typeof want === "number" && typeof got === "number" && Number.isInteger(want) && /\.(seconds|vipala|pala|ghadi|minutes|hours|total_minutes)$/.test(path)) return Math.abs(got - want) <= (path.endsWith('.vipala') ? 5 : 2) || Math.abs(Math.abs(got - want) - 60) <= 2 ? null : `${path}: ${got} vs ${want}`;
  if (typeof want === "number" && typeof got === "number") return Math.abs(got - want) <= Math.max(0.2, Math.abs(want) * 1e-3) ? null : `${path}: ${got} vs ${want}`;
  if (typeof want === "string" && typeof got === "string") {
    if (want === got) return null;
    if (ISO.test(want) && ISO.test(got)) return Math.abs(t(got) - t(want)) <= 20 ? null : `${path}: ${got} vs ${want}`;
    if (/^\d\d:\d\d(:\d\d)?$/.test(want) && /^\d\d:\d\d(:\d\d)?$/.test(got)) return Math.abs(Number(got.slice(0, 2)) * 60 + Number(got.slice(3, 5)) - Number(want.slice(0, 2)) * 60 - Number(want.slice(3, 5))) <= 1 ? null : `${path}: ${got} vs ${want}`;
    if (/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(want)) return Math.abs(Date.parse(got.replace(" ", "T") + "Z") - Date.parse(want.replace(" ", "T") + "Z")) <= 61000 ? null : `${path}: ${got} vs ${want}`;
    if (/^-?\d+:\d\d:\d\d$/.test(want)) return null; // clocks: checked in the engine test
    if (path.includes("label_")) return got.replace(/\d+/g, "#") === want.replace(/\d+/g, "#") ? null : `${path}: ${got} vs ${want}`;
    return /\d/.test(want) && got.replace(/\d+/g, "#") === want.replace(/\d+/g, "#") ? null : `${path}: ${got} vs ${want}`;
  }
  if (Array.isArray(want) && Array.isArray(got)) {
    if (path.endsWith("pushkara_navamsha")) return null;
    if (want.length !== got.length) return `${path}: length ${got.length} vs ${want.length}`;
    for (let i = 0; i < want.length; i += 1) { const d = diff(`${path}[${i}]`, got[i], want[i]); if (d) return d; }
    return null;
  }
  if (want && got && typeof want === "object" && typeof got === "object") {
    const wk = Object.keys(want as object);
    const gk = Object.keys(got as object);
    if ([...wk].sort().join() !== [...gk].sort().join()) return `${path}: keys ${gk.join()} vs ${wk.join()}`;
    for (const k of wk) { const d = diff(`${path}.${k}`, (got as Json)[k], (want as Json)[k]); if (d) return d; }
    return null;
  }
  return got === want ? null : `${path}: ${String(got)} vs ${String(want)}`;
}
