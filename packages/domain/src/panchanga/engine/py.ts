// Python's number behaviour where JavaScript differs (the server was Python first): `%`, `//`, `round`.
export const pyMod = (x: number, m: number) => {
  const r = x % m;
  return r === 0 ? 0 : (m < 0) !== (r < 0) ? r + m : r;
};
export const pyFloorDiv = (x: number, m: number) => Math.floor(x / m);
/** `round(x, n)`: the binary value rounded half to even (a tie is only exact for few-bit values). */
export function pyRound(x: number, n: number): number {
  const scale = 10 ** n;
  const y = x * scale;
  const f = Math.floor(y);
  const diff = y - f;
  const tie = diff === 0.5 && Number.isInteger(y * 2);
  const r = tie ? (f % 2 === 0 ? f : f + 1) : Math.round(y);
  return r / scale;
}
export const pyRoundInt = (x: number) => {
  const f = Math.floor(x);
  const d = x - f;
  return d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x);
};
export const pyInt = (x: number) => Math.trunc(x);
