/**
 * Take the screen for one element, with a fixed overlay as the floor.
 *
 * Generalised from the 3D Aakash Gochar sky, which needed all of this before
 * the Learn diagrams did. Two layers, on purpose:
 *
 * A fixed overlay only ever covers the *page* — the address bar, the tab strip
 * and the OS status bar all stay, and on a phone the URL bar keeps a slice of
 * the canvas. So the Fullscreen API is asked for the rest. It is asked
 * *after* the overlay is already up, and never depended on: iOS Safari has the
 * API on `<video>` alone and refuses this outright, and permissions policy can
 * deny it too. Either way the overlay is on screen and nothing is lost.
 *
 * Leaving by the browser's own exit (Escape, F11, the swipe on a notch) has to
 * bring the overlay down with it, or the page is left in a fullscreen layout
 * that is no longer fullscreen — which is what `fullscreenchange` is watched
 * for.
 *
 * iPad is the one platform that gets none of this: iPadOS 15 gained element
 * fullscreen, so `requestFullscreen` *succeeds* there and Safari takes over
 * the presentation — along with its own way out of it, a downward swipe. A
 * one-finger drag to look toward the ground (or scroll a diagram) then reads
 * as "leave fullscreen" and `fullscreenchange` pulls the overlay down before
 * the drag ever reaches the canvas underneath. iPhone never had this problem
 * because the request is refused there and the fixed overlay was doing all
 * the work already. So on Apple touch devices the native call is skipped
 * outright — no browser presentation means no gesture to lose the drag to.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };

/**
 * An iPhone or an iPad — the platforms whose own fullscreen fights a drag.
 *
 * iPadOS reports itself as a Macintosh and has done since 13, so the user
 * agent alone cannot tell them apart. A real Mac has no touch points; every
 * iPad has five. The pair together is the test.
 */
function isAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 1 && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent);
}

export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const [active, setActive] = useState(false);
  const ref = useRef<T | null>(null);

  const exit = useCallback(() => setActive(false), []);
  const toggle = useCallback(() => setActive((v) => !v), []);

  /* The page behind a fullscreen layer must not scroll, and Escape has to get
     out — the one affordance a fixed overlay owes a keyboard. */
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  useEffect(() => {
    const doc = document as FullscreenDoc;
    const current = () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    if (!active) {
      if (current()) (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      return;
    }

    const el = ref.current as FullscreenEl | null;
    if (!el) return;
    /* iPad drags the page out of fullscreen, so it never goes in — see
       {@link isAppleTouch}. The fixed overlay above is the whole of
       fullscreen there. */
    if (isAppleTouch()) return;
    /* `navigationUI` is a hint; browsers that do not know it ignore the
       dictionary rather than the call. */
    void Promise.resolve(
      el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen?.(),
    ).catch(() => {
      /* Denied — the fixed overlay under this is the whole fallback. */
    });

    const onChange = () => {
      if (!current()) setActive(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [active]);

  return { active, ref, toggle, exit };
}
