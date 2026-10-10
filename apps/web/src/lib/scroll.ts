function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Animated scroll with a fixed duration (native `smooth` timing is browser-dependent). */
export function smoothScrollToElement(
  element: HTMLElement,
  options?: { duration?: number; offset?: number },
): void {
  const duration = options?.duration ?? 400;
  const offset = options?.offset ?? 0;
  const targetY = window.scrollY + element.getBoundingClientRect().top - offset;
  const startY = window.scrollY;
  const delta = targetY - startY;

  if (Math.abs(delta) < 2) return;

  const start = performance.now();

  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + delta * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}
