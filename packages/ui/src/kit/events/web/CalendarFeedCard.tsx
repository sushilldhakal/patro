import { cn } from "@vedic-patro/design-tokens/cn";
import { Icon } from "@vedic-patro/ui";
import type { CalendarFeedCardProps } from "../contract";
import { iconCalendarSync } from "../icons";

/**
 * "In Google or Apple Calendar": the signed-in user's private link, with a button for each
 * calendar app, copy, and a new link (two clicks). The app draws the same card.
 */
export function CalendarFeedCard({ feed, onOpen, onCopy, copyMode, showApple }: CalendarFeedCardProps) {
  const { copy, links } = feed;
  const button = (label: string, onClick: () => void, primary = false) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full px-4 text-sm font-semibold hover:opacity-90",
        primary ? "bg-secondary text-secondary-foreground" : "bg-background text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-muted p-4 dark:bg-foreground/5">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold">
        <Icon node={iconCalendarSync} size={20} tone="secondary" />
        {copy.title}
      </h2>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
      {feed.loading ? (
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      ) : feed.failed || !links ? (
        <button type="button" onClick={feed.retry} className="self-start text-sm text-destructive hover:underline">
          {copy.failed}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {showApple ? button(copy.apple, () => onOpen(links.webcal), true) : null}
            {button(copy.google, () => onOpen(links.google), !showApple)}
            {button(feed.copied ? copy.copied : copyMode === "share" ? copy.shareLink : copy.copyLink, () => onCopy(links.https))}
          </div>
          <input readOnly value={links.https} aria-label={copy.copyLink} onFocus={(e) => e.currentTarget.select()} className="w-full truncate rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground outline-none" />
          <p className="text-xs text-muted-foreground">{copy.privacy}</p>
          <button
            type="button"
            onClick={feed.reset}
            className={cn("self-start text-xs font-semibold hover:underline", feed.confirming ? "text-destructive" : "text-secondary")}
          >
            {copy.reset}
          </button>
        </>
      )}
    </section>
  );
}
