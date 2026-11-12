import { cn } from "@vedic-patro/design-tokens/cn";
import { useTranslation } from "@vedic-patro/i18n/react";

// No country in the path: a /us/ link showed the US storefront page to people in Nepal.
// Without one, Apple opens the listing in the visitor's own store.
export const APP_STORE_URL = "https://apps.apple.com/app/id6820382502";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.vedicpatro.mobile";

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} aria-hidden fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function PlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden fill="currentColor">
      <path d="M48 59.5v393c0 9 4.9 16.5 12.3 20.2L274 256 60.3 39.3C52.9 43 48 50.5 48 59.5zm301.9 272.4L274 256l75.9-75.9 85.6 49.3c24.4 14 24.4 39.2 0 53.2l-85.6 49.3zM60.3 472.7c6.4 3.3 14.4 3.2 22.2-1.3L349.9 331.9 274 256 60.3 472.7zm0-433.4L274 256l75.9-75.9L82.5 40.6c-7.8-4.5-15.8-4.6-22.2-1.3z" opacity=".95" />
    </svg>
  );
}

function useCopy() {
  const { t } = useTranslation();
  return {
    title: t("ui.app_links.title"),
    blurb: t("ui.app_links.blurb"),
    appStoreSmall: t("ui.app_links.download_on"),
    appStore: "App Store",
    playSmall: t("ui.app_links.get_it_on"),
    play: "Google Play",
    iphone: t("ui.app_links.iphone"),
    android: t("ui.app_links.android"),
  };
}

function StoreButton({
  href,
  store,
  small,
  name,
  compact,
}: {
  href: string;
  store: "ios" | "android";
  small: string;
  name: string;
  compact?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg bg-foreground text-background no-underline transition-opacity hover:opacity-90",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      {store === "ios" ? (
        <AppleLogo className={cn("shrink-0", compact ? "size-4" : "size-5")} />
      ) : (
        <PlayLogo className={cn("shrink-0", compact ? "size-4" : "size-5")} />
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-diagram-xs opacity-80">{small}</span>
        <span className={cn("truncate font-semibold", compact ? "text-xs" : "text-sm")}>{name}</span>
      </span>
    </a>
  );
}

/** App Store and Google Play links: a card under the Veda mantra, or a compact block in the nav. */
export function GetTheApp({ variant = "card", className }: { variant?: "card" | "compact"; className?: string }) {
  const c = useCopy();
  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <p className="m-0 text-xs font-semibold text-muted-foreground">{c.title}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <StoreButton compact href={APP_STORE_URL} store="ios" small={c.iphone} name={c.appStore} />
          <StoreButton compact href={PLAY_STORE_URL} store="android" small={c.android} name={c.play} />
        </div>
      </div>
    );
  }
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <h2 className="m-0 text-base font-bold text-foreground">{c.title}</h2>
      <p className="mb-3 mt-1 text-sm text-muted-foreground">{c.blurb}</p>
      <div className="flex flex-wrap gap-2">
        <StoreButton href={APP_STORE_URL} store="ios" small={c.appStoreSmall} name={c.appStore} />
        <StoreButton href={PLAY_STORE_URL} store="android" small={c.playSmall} name={c.play} />
      </div>
    </section>
  );
}
