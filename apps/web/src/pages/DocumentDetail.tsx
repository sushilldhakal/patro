import { useEffect } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useDocumentDetail } from "@vedic-patro/features/documents";
import { PageShell } from "@/components/PageShell";
import { ChapterCard } from "@/components/documents/ChapterCard";
import { DocumentJumpForm } from "@/components/documents/DocumentJumpForm";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ReaderRows } from "@/components/documents/ReaderRows";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsListSearch, type DocumentDetailSearch } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

const SHELL = "min-w-0 max-w-full [overflow-wrap:anywhere]";

/** A document — the website's drawing of `useDocumentDetail` (@vedic-patro/features). */
export function DocumentDetail() {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  // Which list-page tab this document was opened from (see DocumentCard) — so
  // "back to list" returns there instead of always resetting to "all".
  const { category, topic } = useSearch({ strict: false }) as DocumentDetailSearch;
  const page = useDocumentDetail(slug);
  const { doc, copy } = page;

  useRouteLoading(page.status === "loading");

  const { player, versePlayer, fullAudio, mode, startFull, switchToFull, activeShloka, fullRecordingControls } =
    useDocumentPlayback(page.shlokas, page.fullAudioUrl);

  useEffect(() => {
    if (!doc) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [doc]);

  const backLink = (
    <Link
      to="/documents"
      search={documentsListSearch(category ?? "all", topic)}
      className={cn(documentsClasses.backLink, "inline-flex transition-colors hover:text-foreground")}
    >
      <ArrowLeft className="size-4" /> {copy.backToList}
    </Link>
  );

  if (page.status === "not-found" || page.status === "error") {
    return (
      <PageShell showRelatedLinks={false} className={SHELL}>
        {backLink}
        <p className={documentsClasses.notFound}>{copy.notFound}</p>
      </PageShell>
    );
  }

  if (!doc || !page.header) {
    return (
      <PageShell showRelatedLinks={false} className={SHELL}>
        {backLink}
      </PageShell>
    );
  }

  const { header } = page;
  const headerBlock = (
    <header className={cn(documentsClasses.header, "space-y-1.5")}>
      <p className={documentsClasses.headerSanskrit}>{header.sanskrit}</p>
      <h1 className={documentsClasses.headerTitle}>{header.title}</h1>
      {header.subtitle ? <p className={documentsClasses.headerSubtitle}>{header.subtitle}</p> : null}
      {header.description ? <p className={documentsClasses.headerDescription}>{header.description}</p> : null}
      {header.source ? <p className={documentsClasses.headerSource}>{header.source}</p> : null}
    </header>
  );
  const stats = page.stats ? (
    <div className={cn(documentsClasses.statsRow, documentsClasses.statsText)}>
      <span>{page.stats[0]}</span>
      <span aria-hidden="true">·</span>
      <span>{page.stats[1]}</span>
    </div>
  ) : null;

  const hasFullRecording = Boolean(page.fullAudioUrl);
  const playThrough = page.shlokas.find((s) => s.audio_url);

  // Paginated books (Gita, Ashtavakra): chapter cards, then a separate route
  // for verses. Inline-chapter documents stay on this page.
  if (page.layout === "chapters") {
    return (
      <PageShell showRelatedLinks={false} className={`${SHELL} ${hasFullRecording ? "pb-28" : ""}`}>
        {backLink}
        {headerBlock}
        {stats}
        <DocumentJumpForm slug={doc.slug} category={category} topic={topic} chapterNumbers={page.chapterNumbers} />
        <div className="space-y-2">
          {page.chapters.map((card) => (
            <ChapterCard key={card.number} slug={doc.slug} card={card} category={category} topic={topic} />
          ))}
        </div>
        {fullAudio.audioElement}
        <PlaybackBar
          mode={mode === "verse" ? null : mode}
          hasFullRecording={hasFullRecording}
          documentTitle={page.title}
          onStartFull={startFull}
          fullPlaying={fullAudio.playing}
          fullCurrentTime={fullAudio.currentTime}
          fullDuration={fullAudio.duration}
          onToggleFull={fullAudio.toggle}
          onSeekFull={fullAudio.seek}
          activeShloka={null}
          versePlaying={false}
          verseCurrentTime={0}
          verseDuration={0}
          hasNext={false}
          hasPrev={false}
          onToggleVerse={() => {}}
          onNext={() => {}}
          onPrev={() => {}}
          onSwitchToFull={() => {}}
        />
      </PageShell>
    );
  }

  return (
    <PageShell showRelatedLinks={false} className={`${SHELL} pb-28`}>
      {backLink}
      {headerBlock}
      {stats}

      {page.chapterPills.length > 0 ? (
        <nav aria-label={copy.chapterNav} className="flex gap-1.5 overflow-x-auto pb-1">
          {page.chapterPills.map((pill) => (
            <a
              key={pill.number}
              href={`#${pill.anchor}`}
              className={cn(documentsClasses.chapterPill, documentsClasses.chapterPillText, "transition-colors hover:border-secondary/60 hover:text-secondary")}
            >
              {pill.label}
            </a>
          ))}
        </nav>
      ) : null}

      <ReaderRows rows={page.rows} versePlayer={versePlayer} fullRecording={fullRecordingControls} />

      {fullAudio.audioElement}
      <PlaybackBar
        mode={mode}
        hasFullRecording={hasFullRecording}
        documentTitle={page.title}
        onStartFull={startFull}
        onPlayThrough={playThrough ? () => versePlayer.play(playThrough.id) : undefined}
        fullPlaying={fullAudio.playing}
        fullCurrentTime={fullAudio.currentTime}
        fullDuration={fullAudio.duration}
        onToggleFull={fullAudio.toggle}
        onSeekFull={fullAudio.seek}
        activeShloka={activeShloka}
        versePlaying={mode === "verse" && player.playing}
        verseCurrentTime={player.currentTime}
        verseDuration={player.duration}
        hasNext={player.hasNext}
        hasPrev={player.hasPrev}
        onToggleVerse={() => activeShloka && versePlayer.toggle(activeShloka.id)}
        onNext={versePlayer.next}
        onPrev={versePlayer.prev}
        onSwitchToFull={switchToFull}
      />
    </PageShell>
  );
}

export default DocumentDetail;
