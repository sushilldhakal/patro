interface Props {
  src: string;
}

/**
 * Month hero art. Rendered in the initial (SSR/prerendered) HTML with
 * fetchpriority=high and no lazy-loading — it is the home page's LCP element,
 * so it must be immediately discoverable and prioritized by the browser.
 */
export function HeroMonthArt({ src }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden" aria-hidden>
      <img
        src={src}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}
