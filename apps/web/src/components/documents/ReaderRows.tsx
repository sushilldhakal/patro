import type { ReaderRow } from "@vedic-patro/features/documents";
import { ShlokaCard } from "@/components/documents/ShlokaCard";
import type { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

type Playback = ReturnType<typeof useDocumentPlayback>;

/** A document's verse rows (chapter headings, sukta headings, verses) from `@vedic-patro/features/documents`. */
export function ReaderRows({
  rows,
  versePlayer,
  fullRecording,
}: {
  rows: ReaderRow[];
  versePlayer: Playback["versePlayer"];
  fullRecording?: Playback["fullRecordingControls"];
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        if (row.kind === "chapter") {
          return (
            <header key={row.key} id={row.anchor} className={cn(documentsClasses.statsRow, "scroll-mt-24 pt-7")}>
              <span className={cn(documentsClasses.chapterBubble, documentsClasses.chapterBubbleText)}>{row.numberLabel}</span>
              <div className="min-w-0">
                <h2 className={documentsClasses.chapterHeading}>{row.heading}</h2>
                {row.title ? <p className={documentsClasses.chapterHeadingSub}>{row.title}</p> : null}
              </div>
            </header>
          );
        }
        if (row.kind === "sukta") {
          return (
            <div key={row.key} className="pt-3">
              <h2 className={documentsClasses.suktaLabel}>{row.heading}</h2>
              {row.meta ? <p className={documentsClasses.suktaMeta}>{row.meta}</p> : null}
            </div>
          );
        }
        return <ShlokaCard key={row.key} shloka={row.shloka} player={versePlayer} fullRecording={fullRecording} />;
      })}
    </div>
  );
}
