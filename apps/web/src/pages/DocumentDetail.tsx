import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { BookOpen, ChevronRight } from "lucide-react";
import {
  bilingual,
  chapterAnchor,
  shlokaAnchor,
  useDocumentDetail,
  useDocumentLibraryOptions,
  useDocumentSiblings,
} from "@vedic-patro/features/documents";
import { categoryGroup } from "@vedic-patro/domain/learn/document-categories";
import { useLocale } from "@vedic-patro/i18n/react";
import { PageShell } from "@/components/PageShell";
import { ChapterCard } from "@/components/documents/ChapterCard";
import { DocumentsBreadcrumb, type Crumb } from "@/components/documents/DocumentLibraryViews";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ReaderRows } from "@/components/documents/ReaderRows";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { documentsListSearch, type DocumentDetailSearch } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

const SHELL = "min-w-0 max-w-full [overflow-wrap:anywhere]";

/** A document — the website's drawing of `useDocumentDetail` (@vedic-patro/features). */
export function DocumentDetail() {
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug?: string };
  // Which list-page tab and view this document was opened from (see DocumentCard),
  // carried on to its chapters and back to the library.
  const { category, topic, view } = useSearch({ strict: false }) as DocumentDetailSearch;
  const page = useDocumentDetail(slug);
  const library = useDocumentLibraryOptions();
  const { t, lang, digits } = useLocale();
  const { doc, copy } = page;
  const siblings = useDocumentSiblings(doc?.slug, doc?.category);
  const libraryLabel = t("documents.library");

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

  const group = doc ? categoryGroup(doc.category) : undefined;
  const crumbs: Crumb[] = [{ label: libraryLabel, category: "all" }];
  if (group) crumbs.push({ label: bilingual(lang, group.ne, group.en), category: group.id });
  const backLink = <DocumentsBreadcrumb crumbs={crumbs} current={page.title || undefined} view={view} />;

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
    <header className={documentsClasses.readerHero}>
      <span className={documentsClasses.readerHeroMark} aria-hidden="true">
        {t("documents.hero_mark")}
      </span>
      <div className={documentsClasses.readerHeroBody}>
        <p className={documentsClasses.headerSanskrit}>{header.sanskrit}</p>
        <h1 className={documentsClasses.headerTitle}>{header.title}</h1>
        {header.subtitle ? <p className={documentsClasses.headerSubtitle}>{header.subtitle}</p> : null}
        {header.description ? <p className={documentsClasses.headerDescription}>{header.description}</p> : null}
        <div className={documentsClasses.readerFacts}>
          {group ? (
            <Link
              to="/documents"
              search={documentsListSearch(group.id, undefined, view)}
              className={cn(documentsClasses.readerFactLink, "transition-colors hover:bg-secondary/20")}
            >
              {bilingual(lang, group.ne, group.en)}
            </Link>
          ) : null}
          {(page.stats ?? [t("documents.shlokas_count", { count: digits(doc.shloka_count) })]).map((fact) => (
            <span key={fact} className={documentsClasses.readerFact}>
              {fact}
            </span>
          ))}
        </div>
        {header.source ? <p className={cn(documentsClasses.headerSource, "pt-1")}>{header.source}</p> : null}
      </div>
    </header>
  );

  const moreShelf =
    siblings.documents.length > 0 ? (
      <section className="space-y-3 border-t border-border pt-6" aria-labelledby="documents-more">
        <h2 id="documents-more" className={documentsClasses.sectionLabel}>
          {siblings.title}
        </h2>
        <div className={documentsClasses.moreGrid}>
          {siblings.documents.map((other) => (
            <Link
              key={other.slug}
              to="/documents/$slug"
              params={{ slug: other.slug }}
              search={documentsListSearch(other.category, undefined, view)}
              className={cn(documentsClasses.moreCard, "group transition-colors hover:border-secondary/50")}
            >
              <span className={documentsClasses.listDocIcon} aria-hidden="true">
                <BookOpen className="size-4" />
              </span>
              <span className={cn(documentsClasses.listDocTitle, "min-w-0 flex-1")}>{bilingual(lang, other.title_ne, other.title_en)}</span>
              <ChevronRight className={documentsClasses.rowChevron} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  const hasFullRecording = Boolean(page.fullAudioUrl);
  const playThrough = page.shlokas.find((s) => s.audio_url);
  const listSearch = category ? documentsListSearch(category, topic, view) : undefined;

  const jumpForm = (
    <div className={documentsClasses.jumpPanel}>
      <DocumentJumpForm
        chapterNumbers={page.chapterNumbers}
        documents={library}
        currentSlug={doc.slug}
        onSelectDocument={(next) => {
          navigate({ to: "/documents/$slug", params: { slug: next }, search: listSearch });
        }}
        onJump={(chapter, verse) => {
          // Chapter-picker layout: open that chapter (and verse hash when typed).
          if (page.layout === "chapters") {
            if (chapter < 1) return false;
            navigate({
              to: "/documents/$slug/$chapter",
              params: { slug: doc.slug, chapter: String(chapter) },
              search: listSearch,
              hash: verse ? shlokaAnchor(verse) : undefined,
            });
            return true;
          }
          // Reader layout (inline chapters or a flat stotram): scroll on this page.
          if (verse) {
            const el = document.getElementById(shlokaAnchor(verse));
            if (!el) return false;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            return true;
          }
          if (chapter > 0) {
            const el = document.getElementById(chapterAnchor(chapter));
            if (!el) return false;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            return true;
          }
          return false;
        }}
      />
    </div>
  );

  // Paginated books (Gita, Ashtavakra): chapter cards, then a separate route
  // for verses. Inline-chapter documents stay on this page.
  if (page.layout === "chapters") {
    return (
      <PageShell showRelatedLinks={false} className={`${SHELL} ${hasFullRecording ? "pb-28" : ""}`}>
        {backLink}
        {headerBlock}
        {jumpForm}
        <section className="space-y-3" aria-labelledby="documents-chapters">
          <h2 id="documents-chapters" className={documentsClasses.sectionLabel}>
            {copy.chapterNav}
          </h2>
          <div className={documentsClasses.sectionColumns}>
            {page.chapters.map((card) => (
              <ChapterCard key={card.number} slug={doc.slug} card={card} category={category} topic={topic} />
            ))}
          </div>
        </section>
        {moreShelf}
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
      {jumpForm}

      {page.chapterPills.length > 0 ? (
        <nav aria-label={copy.chapterNav} className={documentsClasses.pillsSticky}>
          {page.chapterPills.map((pill) => (
            <a
              key={pill.number}
              href={`#${pill.anchor}`}
              className={cn(documentsClasses.chapterPill, documentsClasses.chapterPillText, "bg-card transition-colors hover:border-secondary/60 hover:text-secondary")}
            >
              {pill.label}
            </a>
          ))}
        </nav>
      ) : null}

      <ReaderRows rows={page.rows} versePlayer={versePlayer} fullRecording={fullRecordingControls} />
      {moreShelf}

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
