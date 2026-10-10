/**
 * Sanity-check the guided chapter tracks.
 *
 *   npm run chapters:check
 *
 * A chapter is data: it names an overlay diagram by id, a still by file path,
 * and its title, part, caption and tips by translation key. None of those are
 * type-checked — a typo compiles perfectly and then shows a blank panel, an
 * empty frame, or a raw `learn.chapters.whatever` on screen, two minutes into a
 * tour nobody replays that far while developing.
 *
 * So this walks every track and asserts the references resolve. It is the
 * cheapest possible guard on the part of the tour that grows.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CHAPTER_TRACKS } from "../src/lib/learn/chapter-tracks";
import { compileChapter } from "../src/lib/learn/chapter-player";
import { strings } from "../src/i18n/strings";
import type { Chapter, ChapterSimState } from "../src/lib/learn/chapter-kit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems: string[] = [];

/**
 * The diagram ids, read out of the registry as text rather than imported.
 *
 * Importing it would pull in forty React components and, through them, `.svg`
 * and `.png` imports that only a bundler can resolve — the module graph behind
 * that registry is the whole Learn library. The ids are all this needs, and
 * they are a flat list of object keys.
 */
function diagramIds(): Set<string> {
  const src = readFileSync(resolve(root, "src/lib/learn/learn-diagrams.tsx"), "utf8");
  const start = src.indexOf("export const LEARN_DIAGRAMS");
  const end = src.indexOf("\n}", start);
  if (start < 0 || end < 0) throw new Error("could not find LEARN_DIAGRAMS in learn-diagrams.tsx");
  const body = src.slice(start, end);
  const ids = new Set<string>();
  for (const m of body.matchAll(/^\s{2}(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/gm)) {
    ids.add(m[1] ?? m[2]!);
  }
  return ids;
}

const DIAGRAMS = diagramIds();

function key(where: string, k: string | undefined) {
  if (!k) return;
  if (!(k in strings)) problems.push(`${where}: no such translation key "${k}"`);
}

/** Every value a track ever writes into one field, defaults included. */
function valuesOf<K extends keyof ChapterSimState>(chapter: Chapter, field: K): ChapterSimState[K][] {
  const out = [chapter.defaults[field]];
  for (const frame of chapter.frames) {
    const v = frame.state[field];
    if (v !== undefined) out.push(v as ChapterSimState[K]);
  }
  return out;
}

for (const track of Object.values(CHAPTER_TRACKS)) {
  const where = `track "${track.id}"`;
  key(where, track.titleKey);
  key(where, track.subtitleKey);

  const seen = new Set<string>();
  for (const chapter of track.chapters) {
    const at = `${where} chapter "${chapter.id}"`;
    if (seen.has(chapter.id)) problems.push(`${at}: duplicate id`);
    seen.add(chapter.id);

    key(at, chapter.titleKey);
    key(at, chapter.partKey);

    for (const id of valuesOf(chapter, "overlay")) {
      if (id && !DIAGRAMS.has(id)) problems.push(`${at}: unknown overlay diagram "${id}"`);
    }
    for (const src of valuesOf(chapter, "still")) {
      if (!src) continue;
      if (src.startsWith("/")) problems.push(`${at}: still "${src}" must not start with a slash`);
      else if (!existsSync(resolve(root, "public", src)))
        problems.push(`${at}: still "${src}" is not in public/`);
    }
    for (const k of valuesOf(chapter, "stillKey")) key(at, k || undefined);
    for (const k of valuesOf(chapter, "tip")) key(at, k || undefined);

    /* A still with no caption is allowed; a caption with no still is a beat
       that will never be seen, which is always a mistake rather than a choice. */
    const hasStill = valuesOf(chapter, "still").some(Boolean);
    const hasCaption = valuesOf(chapter, "stillKey").some(Boolean);
    if (hasCaption && !hasStill) problems.push(`${at}: captions a still it never shows`);

    const { duration } = compileChapter(chapter.defaults, chapter.frames);
    if (chapter.free) {
      if (chapter.frames.length) problems.push(`${at}: a free chapter should have no keyframes`);
    } else if (duration <= 0) {
      problems.push(`${at}: no keyframes, so the chapter ends the moment it starts`);
    } else if (!valuesOf(chapter, "handsOff").some(Boolean)) {
      /* Without one the instruments never come back and the reader is stuck
         watching until they press next. Every ported chapter has one. */
      problems.push(`${at}: never reaches handsOff`);
    }
  }

  const last = track.chapters[track.chapters.length - 1];
  if (!last?.free) problems.push(`${where}: does not end on a free chapter`);
}

if (problems.length) {
  console.error(`Chapter problems (${problems.length}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

const total = Object.values(CHAPTER_TRACKS).reduce((n, t) => n + t.chapters.length, 0);
console.log(`Chapters OK — ${Object.keys(CHAPTER_TRACKS).length} tracks, ${total} chapters.`);
