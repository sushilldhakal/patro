import { useCalendarFeed } from "@vedic-patro/features/events";
import { CalendarFeedCard } from "@vedic-patro/ui/kit/events";
import { CreateEventCards } from "@/components/events/NewEventButton";
import { UpcomingEvents } from "@/components/events/UpcomingEvents";

/** Account → Events and calendar sync: create one, the coming ones (with delete), and the Google / Apple link. */
export function EventsSection() {
  const feed = useCalendarFeed({ enabled: true, origin: window.location.origin });
  return (
    <div className="flex flex-col gap-6">
      <CreateEventCards />
      <UpcomingEvents />
      <CalendarFeedCard
        feed={feed}
        showApple
        copyMode="copy"
        onOpen={(url) => window.open(url, "_blank", "noopener")}
        onCopy={(url) => {
          void navigator.clipboard?.writeText(url).then(feed.markCopied, () => {});
        }}
      />
    </div>
  );
}
