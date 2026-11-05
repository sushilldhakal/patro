export type SvaraPiece = { text: string; marks: string };

const LETTERS = "अउकनपरविऔ";

/** Pitch digit or svara letter written above a Samaveda syllable. */
function markOf(cp: number): string | null {
  if (cp >= 0xa8e0 && cp <= 0xa8e9) return String(cp - 0xa8e0);
  if (cp >= 0xa8ea && cp <= 0xa8f1) return LETTERS[cp - 0xa8ea] ?? null;
  return null;
}

function isLetter(cp: number): boolean {
  return (
    (cp >= 0x0904 && cp <= 0x0939) ||
    cp === 0x0950 ||
    (cp >= 0x0958 && cp <= 0x0961) ||
    (cp >= 0x0972 && cp <= 0x097f)
  );
}

/** Matras, anusvara, visarga, nukta — they stay on the syllable they follow. */
function isDependent(cp: number): boolean {
  return (
    (cp >= 0x0900 && cp <= 0x0903) ||
    cp === 0x093c ||
    (cp >= 0x093e && cp <= 0x094c) ||
    (cp >= 0x094e && cp <= 0x094f) ||
    (cp >= 0x0951 && cp <= 0x0957) ||
    (cp >= 0x0962 && cp <= 0x0963) ||
    cp === 0x200c ||
    cp === 0x200d
  );
}

/**
 * Split a Samaveda mantra so each pitch digit (and the occasional svara
 * letter) can sit above the syllable it marks. Combining marks
 * U+A8E0–U+A8F1 become "0"–"9" and अ उ क न प र वि औ. Spaces stay their own
 * unmarked pieces. Returns [] when the line has no marks, so every other
 * text keeps the plain mantra only.
 */
export function svaraPieces(source: string): SvaraPiece[] {
  const pieces: SvaraPiece[] = [];
  let text = "";
  let marks = "";
  let afterVirama = false;

  const flush = () => {
    if (!text && !marks) return;
    pieces.push({ text, marks });
    text = "";
    marks = "";
  };

  for (const ch of source) {
    const cp = ch.codePointAt(0)!;
    const mark = markOf(cp);
    if (mark) {
      marks += mark;
      afterVirama = false;
      continue;
    }
    if (ch === " " || ch === "\n" || ch === "\t") {
      flush();
      const last = pieces[pieces.length - 1];
      if (last && !last.marks && last.text.trim() === "") last.text += ch;
      else pieces.push({ text: ch, marks: "" });
      afterVirama = false;
      continue;
    }
    if (cp === 0x094d) {
      text += ch;
      afterVirama = true;
      continue;
    }
    if (isDependent(cp)) {
      text += ch;
      afterVirama = false;
      continue;
    }
    if (afterVirama) {
      text += ch;
      afterVirama = false;
      continue;
    }
    if (isLetter(cp)) {
      flush();
      text = ch;
      continue;
    }
    // Danda and the verse number sit beside the mantra, not under a digit.
    if (marks) flush();
    text += ch;
  }
  flush();

  if (!pieces.some((piece) => piece.marks)) return [];
  return pieces;
}
