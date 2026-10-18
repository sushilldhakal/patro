import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { shlokaAnchor, useDocumentChapter } from "@vedic-patro/features/documents";
import { PageShell } from "@/components/PageShell";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ReaderRows } from "@/components/documents/ReaderRows";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsListSearch, type DocumentDetailSearch } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

const SHELL = "min-w-0 max-w-full [overflow-wrap:anywhere]";
const pagerLink = cn(documentsClasses.pagerButton, "inline-flex transition-colors hover:border-secondary/60 hover:text-secondary");

/**
 * One chapter of a chaptered document — the website's drawing of
 * `useDocumentChapter` (@vedic-patro/features): verses for this chapter alone.
 */
export function DocumentChapterDetail() {
  const navigate = useNavigate();
  const { slug, chapter: chapterParam } = useParams({ strict: false }) as { slug?: string; chapter?: string };
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const { category, topic } = useSearch({ strict: false }) as DocumentDetailSearch;
  const page = useDocumentChapter(slug, chapterNumber);
  const { copy } = page;
  const search = category ? documentsListSearch(category, topic) : undefined;

  useRouteLoading(page.loading);

  const { player, versePlayer, fullAudio, mode, startFull, switchToFull, activeShloka } = useDocumentPlayback(
    page.shlokas,
    page.fullAudioUrl,
  );

  // Deep link to a specific verse (e.g. from DocumentJumpForm) — scroll to it
  // once this chapter's shlokas have rendered.
  const ready = page.status === "ready";
  useEffect(() => {
    if (!ready) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [ready, page.rows]);

  if (page.redirectToDocument && slug) {
    return <Navigate to="/documents/$slug" params={{ slug }} search={search} hash={page.redirectToDocument.anchor} replace />;
  }

  const backLink = page.valid ? (
    <Link
      to="/documents/$slug"
      params={{ slug: slug! }}
      search={search}
      className={cn(documentsClasses.backLink, "inline-flex transition-colors hover:text-foreground")}
    >
      <ArrowLeft className="size-4" /> {copy.backToChapters}
    </Link>
  ) : (
    <Link
      to="/documents"
      search={documentsListSearch("all")}
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

  if (!ready) {
    return (
      <PageShell showRelatedLinks={false} className={SHELL}>
        {backLink}
      </PageShell>
    );
  }

  const playThrough = page.shlokas.find((s) => s.audio_url);

  return (
    <PageShell showRelatedLinks={false} className={`${SHELL} pb-28`}>
      {backLink}

      <header className={cn(documentsClasses.header, "space-y-1.5")}>
        <div className={documentsClasses.chapterTitleRow}>
          <p className={documentsClasses.headerSanskrit}>{page.docTitle}</p>
          {page.progress ? <p className={documentsClasses.chapterProgress}>{page.progress}</p> : null}
        </div>
        <div className={documentsClasses.statsRow}>
          <span className={cn(documentsClasses.chapterBubble, documentsClasses.chapterBubbleText)}>{page.numberLabel}</span>
          <h1 className={documentsClasses.chapterTitle}>
            {page.heading}
            {page.chapterTitle ? <span className={cn(documentsClasses.chapterTitleSub, "block")}>{page.chapterTitle}</span> : null}
          </h1>
        </div>
      </header>

      <DocumentJumpForm
        chapterNumbers={page.chapterNumbers}
        currentChapter={chapterNumber}
        onJump={(chapter, verse) => {
          const hash = verse ? shlokaAnchor(verse) : undefined;
          if (chapter === chapterNumber) {
            const el = hash ? document.getElementById(hash) : null;
            if (!el) return false;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            return true;
          }
          navigate({
            to: "/documents/$slug/$chapter",
            params: { slug: slug!, chapter: String(chapter) },
            search,
            hash,
          });
          return true;
        }}
      />

      <ReaderRows rows={page.rows} versePlayer={versePlayer} />

      <nav className={cn(documentsClasses.pager, documentsClasses.pagerButtonText)}>
        {page.prev != null ? (
          <Link to="/documents/$slug/$chapter" params={{ slug: slug!, chapter: String(page.prev) }} search={search} className={pagerLink}>
            <ChevronLeft className="size-4" /> {copy.prevChapter}
          </Link>
        ) : (
          <span />
        )}
        {page.next != null ? (
          <Link to="/documents/$slug/$chapter" params={{ slug: slug!, chapter: String(page.next) }} search={search} className={pagerLink}>
            {copy.nextChapter} <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {fullAudio.audioElement}
      <PlaybackBar
        mode={mode}
        hasFullRecording={Boolean(page.fullAudioUrl)}
        documentTitle={page.docTitle}
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

export default DocumentChapterDetail;
