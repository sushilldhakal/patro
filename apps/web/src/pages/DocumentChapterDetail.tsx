import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useRouterState, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { shlokaAnchor, useDocumentChapter, useDocumentLibraryOptions } from "@vedic-patro/features/documents";
import { PageShell } from "@/components/PageShell";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ReaderRows } from "@/components/documents/ReaderRows";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsListSearch, type DocumentDetailSearch } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

const SHELL = "min-w-0 max-w-full space-y-3 py-3 [overflow-wrap:anywhere]";
const pagerLink = cn(documentsClasses.pagerButton, "inline-flex transition-colors hover:border-secondary/60 hover:text-secondary");

const scrollKey = (slug: string, chapter: number) => `vedic-patro:doc-chapter:${slug}:${chapter}`;

function verseFromHash(hash: string): string | undefined {
  const id = hash.replace(/^#/, "");
  if (!id.startsWith("shloka-") || id.startsWith("shloka-note-")) return undefined;
  return id.slice("shloka-".length);
}

/**
 * One chapter of a chaptered document — the website's drawing of
 * `useDocumentChapter` (@vedic-patro/features): verses for this chapter alone.
 */
export function DocumentChapterDetail() {
  const navigate = useNavigate();
  const { slug, chapter: chapterParam } = useParams({ strict: false }) as { slug?: string; chapter?: string };
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const hash = useRouterState({ select: (s) => s.location.hash });
  const { category, topic } = useSearch({ strict: false }) as DocumentDetailSearch;
  const [boot, setBoot] = useState<{ slug: string; chapter: number; verse?: string; align: "center" | "start" } | null>(null);
  useEffect(() => {
    if (!slug || !Number.isFinite(chapterNumber)) return;
    const fromHash = verseFromHash(hash);
    const next = {
      slug,
      chapter: chapterNumber,
      verse: fromHash,
      align: "center" as const,
    };
    // After paint, so the server HTML and the first client render both show the shell.
    const t = window.setTimeout(() => setBoot(next), 0);
    return () => window.clearTimeout(t);
  }, [slug, chapterNumber, hash]);
  const booted = boot != null && boot.slug === slug && boot.chapter === chapterNumber;
  const page = useDocumentChapter(slug, chapterNumber, {
    verse: booted ? boot.verse : undefined,
    enabled: booted,
  });
  // A link or a click opens the chapter at the first verse. A verse hash still jumps.
  useLayoutEffect(() => {
    if (!slug || !Number.isFinite(chapterNumber)) return;
    if (verseFromHash(hash)) return;
    if (page.status !== "ready" || !booted) return;
    window.scrollTo(0, 0);
  }, [slug, chapterNumber, hash, page.status, booted]);
  const library = useDocumentLibraryOptions();
  const { copy } = page;
  const search = category ? documentsListSearch(category, topic) : undefined;
  const place = `${slug ?? ""}:${chapterNumber}:${hash}`;
  const [jump, setJump] = useState<{ place: string; label: string; nonce: number } | null>(null);
  const focus =
    jump && jump.place === place
      ? { label: jump.label, nonce: jump.nonce, align: "center" as const }
      : booted && boot.verse
        ? { label: boot.verse, nonce: 0, align: boot.align }
        : null;

  useRouteLoading(page.loading);

  const { shlokas, hasNextPage, hasPreviousPage, fetchNextPage, fetchPreviousPage, isFetchingNextPage, isFetchingPreviousPage } = page;
  const { player, versePlayer, fullAudio, mode, startFull, switchToFull, activeShloka, hasSuktaAudio, suktaNumber } = useDocumentPlayback(
    shlokas,
    page.fullAudioUrl,
    page.complete,
  );

  const { hasNext: verseHasNext, hasPrev: verseHasPrev, next: playNext, prev: playPrev } = versePlayer;
  // Keep play-through moving into the next (or previous) page before the loaded window runs out.
  const waitingForPage = useRef(false);
  useEffect(() => {
    if (!activeShloka || !player.playing) return;
    const at = shlokas.findIndex((s) => s.id === activeShloka.id);
    waitingForPage.current = at >= 0 && at === shlokas.length - 1 && hasNextPage && !verseHasNext;
    if (hasNextPage && at >= shlokas.length - 8) void fetchNextPage();
    if (hasPreviousPage && at <= 2) void fetchPreviousPage();
  }, [activeShloka, player.playing, shlokas, hasNextPage, hasPreviousPage, fetchNextPage, fetchPreviousPage, verseHasNext]);

  useEffect(() => {
    if (!waitingForPage.current || player.playing || player.currentTime > 0.05) return;
    if (verseHasNext) {
      waitingForPage.current = false;
      playNext();
    }
  }, [shlokas, player.playing, player.currentTime, verseHasNext, playNext]);

  const resume = useRef<"next" | "prev" | null>(null);
  useEffect(() => {
    if (resume.current === "next" && verseHasNext) {
      resume.current = null;
      playNext();
    } else if (resume.current === "prev" && verseHasPrev) {
      resume.current = null;
      playPrev();
    }
  }, [shlokas, verseHasNext, verseHasPrev, playNext, playPrev]);

  const onNext = useCallback(() => {
    if (verseHasNext) playNext();
    else if (hasNextPage) {
      resume.current = "next";
      void fetchNextPage();
    }
  }, [verseHasNext, playNext, hasNextPage, fetchNextPage]);
  const onPrev = useCallback(() => {
    if (verseHasPrev) playPrev();
    else if (hasPreviousPage) {
      resume.current = "prev";
      void fetchPreviousPage();
    }
  }, [verseHasPrev, playPrev, hasPreviousPage, fetchPreviousPage]);

  const loadNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const loadPrev = useCallback(() => {
    if (hasPreviousPage && !isFetchingPreviousPage) void fetchPreviousPage();
  }, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);
  const rememberVerse = useCallback(
    (label: string) => {
      if (!slug || !Number.isFinite(chapterNumber)) return;
      sessionStorage.setItem(scrollKey(slug, chapterNumber), JSON.stringify({ verse: label }));
    },
    [slug, chapterNumber],
  );

  if (page.redirectToDocument && slug) {
    return <Navigate to="/documents/$slug" params={{ slug }} search={search} hash={page.redirectToDocument.anchor} replace />;
  }

  const backLink = page.valid ? (
    <Link
      to="/documents/$slug"
      params={{ slug: slug! }}
      search={search}
      className={cn(documentsClasses.readerBarBack, "transition-colors hover:text-foreground")}
    >
      <ArrowLeft className="size-4 shrink-0" />
      <span className="truncate">{copy.backToChapters}</span>
    </Link>
  ) : (
    <Link
      to="/documents"
      search={documentsListSearch("all")}
      className={cn(documentsClasses.readerBarBack, "transition-colors hover:text-foreground")}
    >
      <ArrowLeft className="size-4 shrink-0" />
      <span className="truncate">{copy.backToList}</span>
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

  const ready = page.status === "ready" && booted;

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
      <header className={documentsClasses.readerBar}>
        <div className={documentsClasses.readerBarSlot}>{backLink}</div>
        <div className={documentsClasses.readerBarHeading}>
          <h1 className={documentsClasses.readerBarName}>{page.docTitle}</h1>
          {page.displayTitle ? <p className={documentsClasses.readerBarChapter}>{page.displayTitle}</p> : null}
        </div>
        <p className={cn(documentsClasses.readerBarSlot, documentsClasses.readerBarSide)}>{page.progress}</p>
      </header>

      <DocumentJumpForm
        chapterNumbers={page.chapterNumbers}
        chapterPrefixes={page.chapterPrefixes}
        currentChapter={chapterNumber}
        documents={library}
        currentSlug={slug}
        onSelectDocument={(next) => {
          navigate({ to: "/documents/$slug", params: { slug: next }, search });
        }}
        onJump={async (chapter, verse) => {
          const hashId = verse ? shlokaAnchor(verse) : undefined;
          if (chapter === chapterNumber) {
            if (!verse) return true;
            const ok = await page.focusVerse(verse);
            if (!ok) return false;
            setJump({ place, label: verse, nonce: Date.now() });
            return true;
          }
          navigate({
            to: "/documents/$slug/$chapter",
            params: { slug: slug!, chapter: String(chapter) },
            search,
            hash: hashId,
          });
          return true;
        }}
      />

      <ReaderRows
        virtual
        rows={page.rows}
        versePlayer={versePlayer}
        loadingPrev={page.isFetchingPreviousPage}
        loadingNext={page.isFetchingNextPage}
        onNearStart={loadPrev}
        onNearEnd={loadNext}
        focus={focus}
        activeVerseId={player.activeId}
        onTopVerse={rememberVerse}
      />

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
        hasSuktaAudio={hasSuktaAudio}
        suktaNumber={mode === "full" ? suktaNumber : null}
        documentTitle={page.docTitle}
        onStartFull={startFull}
        // Only when every verse is recorded: with a few recordings it would jump far ahead to the first one.
        onPlayThrough={!versePlayer.coversAll ? undefined : hasSuktaAudio ? startFull : playThrough ? () => versePlayer.play(playThrough.id) : undefined}
        fullPlaying={fullAudio.playing}
        fullCurrentTime={fullAudio.currentTime}
        fullDuration={fullAudio.duration}
        onToggleFull={fullAudio.toggle}
        onSeekFull={fullAudio.seek}
        activeShloka={activeShloka}
        versePlaying={mode === "verse" && player.playing}
        verseCurrentTime={player.currentTime}
        verseDuration={player.duration}
        hasNext={player.hasNext || page.hasNextPage}
        hasPrev={player.hasPrev || page.hasPreviousPage}
        onToggleVerse={() => activeShloka && versePlayer.toggle(activeShloka.id)}
        onNext={onNext}
        onPrev={onPrev}
        onSwitchToFull={switchToFull}
      />
    </PageShell>
  );
}

export default DocumentChapterDetail;
