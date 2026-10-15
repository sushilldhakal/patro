import { Pause, Play } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { playsFromFullRecording, useShlokaCard } from "@vedic-patro/features/documents";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Shloka } from "@/lib/documents-api";
import type { ShlokaPlayerState } from "@/hooks/use-shloka-player";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

interface Props {
  shloka: Shloka;
  player: ShlokaPlayerState;
  /**
   * Present when the document has a full recording. A verse with no clip of
   * its own but a timestamp within that recording gets a play button that
   * starts the full recording from that verse.
   */
  fullRecording?: { playing: boolean; toggleAt: (id: number) => void };
}

/**
 * One verse: Sanskrit + optional transliteration, a play toggle, and a
 * meaning accordion. Registers itself with the player so it can be
 * scrolled into view and highlighted while its audio plays.
 */
export function ShlokaCard({ shloka, player, fullRecording }: Props) {
  const isActive = player.activeId === shloka.id;
  const playsFromFull = fullRecording != null && playsFromFullRecording(shloka, true);
  const isPlaying = isActive && (playsFromFull ? fullRecording!.playing : player.playing);
  const card = useShlokaCard({
    shloka,
    isActive,
    isPlaying,
    playsFromFull,
    progress: player.progress,
    clip: { currentTime: player.currentTime, duration: player.duration },
  });
  const { canPlay, isClosing, isNote, vedaCite, meaning } = card;
  const accordionValue = player.openMeaningIds.has(shloka.id) ? "meaning" : "";

  return (
    <section
      ref={(el) => player.registerItemRef(shloka.id, el)}
      id={card.domId}
      className={cn(
        documentsClasses.verse,
        "scroll-mt-24 min-w-0 max-w-full [overflow-wrap:anywhere] transition-colors",
        isActive ? documentsClasses.verseActive : documentsClasses.verseIdle,
        isClosing && !isActive && documentsClasses.verseClosing,
        isNote && !isActive && documentsClasses.verseNote,
      )}
    >
      <div className={documentsClasses.verseRow}>
        {canPlay ? (
          <button
            type="button"
            onClick={() =>
              playsFromFull ? fullRecording!.toggleAt(shloka.id) : player.toggle(shloka.id)
            }
            aria-label={card.copy.play}
            className={cn(
              documentsClasses.versePlay,
              "transition-colors",
              isActive
                ? cn(documentsClasses.versePlayActive, "text-secondary-foreground")
                : cn(documentsClasses.versePlayIdle, "text-secondary hover:border-secondary/60 hover:bg-secondary/10"),
            )}
          >
            {isPlaying ? (
              <Pause className="size-4" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 size-4" fill="currentColor" strokeWidth={0} />
            )}
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={cn(documentsClasses.verseLabelSlot, documentsClasses.verseLabelSlotText)}
          >
            {shloka.verse_label}
          </span>
        )}

        <div className={documentsClasses.fill}>
          {canPlay || vedaCite ? (
            <div className={documentsClasses.verseMetaRow}>
              {canPlay ? (
                <span className={cn(documentsClasses.verseBadge, documentsClasses.verseBadgeText)}>
                  {shloka.verse_label}
                </span>
              ) : (
                <span />
              )}
              {vedaCite ? (
                <span className={documentsClasses.verseCite}>
                  {vedaCite}
                </span>
              ) : null}
            </div>
          ) : null}
          <p
            className={cn(
              isNote ? documentsClasses.verseTextNote : documentsClasses.verseText,
              isNote && "whitespace-pre-line",
            )}
          >
            {card.tokens.map((tok, i) =>
              i === card.activeTokenIndex ? (
                <span
                  key={i}
                  className={cn(documentsClasses.verseWord, "transition-colors duration-150")}
                >
                  {tok}
                </span>
              ) : (
                tok
              ),
            )}
          </p>
          {card.transliteration ? (
            <p className={documentsClasses.verseTranslit}>{card.transliteration}</p>
          ) : null}

          {isActive ? (
            <div className={documentsClasses.verseProgress}>
              <div
                className={cn(documentsClasses.verseProgressFill, "transition-[width]")}
                style={{ width: `${card.progressPct}%` }}
              />
            </div>
          ) : null}

          {meaning ? (
            <Accordion
              type="single"
              collapsible
              value={accordionValue}
              onValueChange={() => player.toggleMeaning(shloka.id)}
              className={documentsClasses.verseMeaningWrap}
            >
              <AccordionItem value="meaning" className="border-none">
                <AccordionTrigger className={cn(documentsClasses.verseMeaningToggle, documentsClasses.verseMeaningToggleText, "w-fit hover:no-underline")}>
                  {card.copy.meaning}
                </AccordionTrigger>
                <AccordionContent className={cn(documentsClasses.verseMeaning, "whitespace-pre-line")}>
                  {meaning}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>
      </div>
    </section>
  );
}
