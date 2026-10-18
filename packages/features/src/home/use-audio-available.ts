import { useEffect, useState } from "react";
import { isAudioAvailable } from "@vedic-patro/api-client";

/**
 * False once a recording's file is known to be missing from storage, so the page can drop
 * its play button instead of showing one that does nothing. True until then (and whenever
 * the check cannot answer). See {@link isAudioAvailable}.
 */
export function useAudioAvailable(url: string | null | undefined): boolean {
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    void isAudioAvailable(url).then((ok) => {
      if (live && !ok) setMissing(url);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return !url || missing !== url;
}
