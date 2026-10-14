import { useMemo } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { bilingualText, useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { activeTokenAt, buildWordTrack } from "@vedic-patro/domain/word-tracking";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatVedaCite, type Shloka } from "@/lib/documents-api";
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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const isActive = player.activeId === shloka.id;
  const playsFromFull =
    !shloka.audio_url && fullRecording != null && shloka.full_audio_start != null;
  const canPlay = Boolean(shloka.audio_url) || playsFromFull;
  const isPlaying = isActive && (playsFromFull ? fullRecording!.playing : player.playing);
  const meaningOpen = player.openMeaningIds.has(shloka.id);
  const meaning = bilingualText(lang, shloka.meaning_ne, shloka.meaning_en, "");
  const accordionValue = meaningOpen ? "meaning" : "";
  const isClosing =
    shloka.verse_label.startsWith(/* copy-ok */ "इति") || shloka.verse_label === /* copy-ok */ "ध्यानम्";
  // Procedure text (Nepali टीका / सामग्री lists) rather than a mantra — e.g. the
  // Agni Sthapana Vidhi. Rendered as readable instructions, not as a verse.
  const isNote = /^(टीका|सामग्री)/.test(shloka.verse_label);
  const vedaCite = formatVedaCite(shloka.veda_cite, lang);
  const shlokaDomId = `shloka-${shloka.verse_label.replace(/\s+/g, "-")}`;

  // Estimated word timing — see lib/word-tracking.ts.
  const wordTrack = useMemo(() => buildWordTrack(shloka.sanskrit), [shloka.sanskrit]);
  const { tokens } = wordTrack;
  // From the full recording there is no per-clip time/duration, only the
  // verse's progress between its start and end timestamps.
  const verseFraction = playsFromFull
    ? player.progress
    : player.duration > 0
      ? player.currentTime / player.duration
      : -1;
  const activeTokenIndex = isPlaying ? activeTokenAt(wordTrack, verseFraction) : -1;

  return (
    <section
      ref={(el) => player.registerItemRef(shloka.id, el)}
      id={shlokaDomId}
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
            aria-label={t(isPlaying ? "documents.pause_verse" : "documents.play_verse")}
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
            {tokens.map((tok, i) =>
              i === activeTokenIndex ? (
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
          {lang !== "ne" && shloka.transliteration ? (
            <p className={documentsClasses.verseTranslit}>{shloka.transliteration}</p>
          ) : null}

          {isActive ? (
            <div className={documentsClasses.verseProgress}>
              <div
                className={cn(documentsClasses.verseProgressFill, "transition-[width]")}
                style={{ width: `${Math.round(player.progress * 100)}%` }}
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
                  {t("documents.meaning")}
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
