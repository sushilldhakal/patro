/**
 * Patro-style upright label along a cell edge (festival names, sun times):
 * spaces become thin spaces so the text stays one vertical run, and longer
 * text steps down in size. Shared by the website's and the app's
 * `VerticalEdgeLabel`.
 */
export function verticalEdgeLabel(text: string): { label: string; fontSize: number } {
  const label = text.replace(/\s+/g, "\u2009");
  const fontSize = label.length > 20 ? 8 : label.length > 16 ? 9 : label.length > 12 ? 10 : 11;
  return { label, fontSize };
}
