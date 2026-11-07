import { useEffect, useState } from "react";

const known = new Map<string, Promise<boolean>>();
const PROBE_TIMEOUT_MS = 15000;

/**
 * Whether a recording is really in storage. The Rigveda bucket sends no CORS headers, so a
 * `fetch(HEAD)` from the page fails whatever the answer; an `<audio>` element loading only the
 * file's metadata needs no CORS and errors on a 404. Anything other than "source not found"
 * (offline, slow, a decoder quirk) counts as present, so a working button is never hidden.
 */
export function canLoadAudio(url: string): Promise<boolean> {
  let answer = known.get(url);
  if (!answer) {
    answer = new Promise<boolean>((resolve) => {
      if (typeof Audio === "undefined") return resolve(true);
      const audio = new Audio();
      let timer = 0;
      const done = (ok: boolean) => {
        window.clearTimeout(timer);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        audio.removeAttribute("src");
        audio.load();
        resolve(ok);
      };
      timer = window.setTimeout(() => done(true), PROBE_TIMEOUT_MS);
      audio.onloadedmetadata = () => done(true);
      audio.onerror = () => done(audio.error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      audio.preload = "metadata";
      audio.src = url;
    });
    known.set(url, answer);
  }
  return answer;
}

/** Each url's answer once it is known (a few probes at a time). Unknown urls are absent. */
export function useAudioProbe(urls: readonly string[]): ReadonlyMap<string, boolean> {
  const [answers, setAnswers] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const key = urls.join("\n");
  useEffect(() => {
    let cancelled = false;
    const queue = key ? key.split("\n") : [];
    const found = new Map<string, boolean>();
    let flushTimer = 0;
    const flush = () => {
      flushTimer = 0;
      if (cancelled || found.size === 0) return;
      const batch = new Map(found);
      found.clear();
      setAnswers((prev) => {
        let changed = false;
        for (const [url, ok] of batch) if (prev.get(url) !== ok) changed = true;
        return changed ? new Map([...prev, ...batch]) : prev;
      });
    };
    const worker = async () => {
      for (let url = queue.shift(); url && !cancelled; url = queue.shift()) {
        const ok = await canLoadAudio(url);
        found.set(url, ok);
        // One state update per batch, not per file.
        if (!flushTimer) flushTimer = window.setTimeout(flush, 120);
      }
    };
    void Promise.all(Array.from({ length: 4 }, worker)).then(flush);
    return () => {
      cancelled = true;
      window.clearTimeout(flushTimer);
    };
  }, [key]);
  return answers;
}
