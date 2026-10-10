import { useEffect, useMemo } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ChapterCard } from "@/components/documents/ChapterCard";
import { DocumentJumpForm } from "@/components/documents/DocumentJumpForm";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ShlokaCard } from "@/components/documents/ShlokaCard";
import { useDocumentPlayback } from "@/hooks/use-document-playback";
import { bilingualText, useLocale } from "@/i18n/locale";
import { ApiError } from "@/lib/api";
import {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  documentsListSearch,
  fetchDocumentDetail,
  flattenShlokas,
  type DocumentChapter,
  type DocumentDetailSearch,
} from "@/lib/documents-api";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { useRouteLoading } from "@/lib/route-loading";

function chapterAnchor(number: number) {
  return `chapter-${number}`;
}

function chapterNumbersOf(chapters: DocumentChapter[]): number[] {
  return chapters.map((c) => c.number).filter((n): n is number => n != null);
}

export function DocumentDetail() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { slug } = useParams({ strict: false }) as { slug?: string };
  // Which list-page tab this document was opened from (see DocumentCard) — so
  // "back to list" returns there instead of always resetting to "all".
  const { category, topic } = useSearch({ strict: false }) as DocumentDetailSearch;
  const num = (n: number) => (lang === "ne" ? toNepaliDigits(String(n)) : String(n));

  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  useRouteLoading(docQ.isLoading);

  const doc = docQ.data;
  const shlokas = useMemo(() => (doc ? flattenShlokas(doc) : []), [doc]);
  const {
    player,
    versePlayer,
    fullAudio,
    mode,
    startFull,
    switchToFull,
    activeShloka,
    fullRecordingControls,
  } = useDocumentPlayback(shlokas, doc?.full_audio_url);

  const inlineChapters = useMemo(() => {
    if (!doc?.inline_chapters) return [];
    return doc.chapters.filter((chapter) => (chapter.shlokas?.length ?? 0) > 0);
  }, [doc]);

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
      className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {t("documents.back_to_list")}
    </Link>
  );

  if (!slug || (docQ.isError && !docQ.isLoading)) {
    return (
      <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
        {backLink}
        <p className="mt-4 text-sm text-muted-foreground">{t("documents.not_found")}</p>
      </PageShell>
    );
  }

  if (!doc) {
    return (
      <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
        {backLink}
      </PageShell>
    );
  }

  const title = bilingualText(lang, doc.title_ne, doc.title_en);
  const subtitle = bilingualText(lang, doc.subtitle_ne, doc.subtitle_en);
  const description = bilingualText(lang, doc.description_ne, doc.description_en);
  const source = bilingualText(lang, doc.source_ne, doc.source_en);

  const header = (
    <header className="space-y-1.5">
      <p className="text-sm font-medium text-secondary">{doc.title_sa}</p>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      {source ? (
        <p className="text-xs text-muted-foreground">
          {t("documents.source")}: {source}
        </p>
      ) : null}
    </header>
  );

  const playback = (
    <>
      {fullAudio.audioElement}
      <PlaybackBar
        mode={mode}
        hasFullRecording={Boolean(doc.full_audio_url)}
        documentTitle={title}
        onStartFull={startFull}
        onPlayThrough={
          shlokas.some((s) => s.audio_url)
            ? () => {
                const first = shlokas.find((s) => s.audio_url);
                if (first) versePlayer.play(first.id);
              }
            : undefined
        }
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
    </>
  );

  // Paginated books (Gita, Ashtavakra): chapter cards, then a separate route
  // for verses. Inline-chapter documents stay on this page.
  if (doc.has_chapters && !doc.inline_chapters) {
    const hasFullRecording = Boolean(doc.full_audio_url);
    return (
      <PageShell showRelatedLinks={false} className={`min-w-0 max-w-full [overflow-wrap:anywhere] ${hasFullRecording ? "pb-28" : ""}`}>
        {backLink}
        {header}
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{t("documents.chapters_count", { count: num(doc.chapter_count) })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("documents.shlokas_count", { count: num(doc.shloka_count) })}</span>
        </div>
        <DocumentJumpForm
          slug={doc.slug}
          category={category}
          topic={topic}
          chapterNumbers={chapterNumbersOf(doc.chapters)}
        />
        <div className="space-y-2">
          {doc.chapters.map((chapter) => (
            <ChapterCard
              key={chapter.number ?? "single"}
              slug={doc.slug}
              chapter={chapter}
              category={category}
              topic={topic}
            />
          ))}
        </div>
        {fullAudio.audioElement}
        <PlaybackBar
          mode={mode === "verse" ? null : mode}
          hasFullRecording={hasFullRecording}
          documentTitle={title}
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
    <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere] pb-28">
      {backLink}
      {header}

      {doc.has_chapters ? (
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{t("documents.chapters_count", { count: num(doc.chapter_count) })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("documents.shlokas_count", { count: num(doc.shloka_count) })}</span>
        </div>
      ) : null}

      {inlineChapters.length > 1 ? (
        <nav aria-label={t("documents.chapter_nav")} className="flex gap-1.5 overflow-x-auto pb-1">
          {inlineChapters.map((chapter) =>
            chapter.number == null ? null : (
              <a
                key={chapter.number}
                href={`#${chapterAnchor(chapter.number)}`}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-sm font-bold tabular-nums text-muted-foreground transition-colors hover:border-secondary/60 hover:text-secondary"
              >
                {num(chapter.number)}
              </a>
            ),
          )}
        </nav>
      ) : null}

      {inlineChapters.length > 1 ? (
        <div className="space-y-10">
          {inlineChapters.map((chapter) => (
            <InlineChapterSection
              key={chapter.number ?? "single"}
              chapter={chapter}
              num={num}
              versePlayer={versePlayer}
              fullRecording={fullRecordingControls}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {shlokas.map((shloka) => (
            <ShlokaCard
              key={shloka.id}
              shloka={shloka}
              player={versePlayer}
              fullRecording={fullRecordingControls}
            />
          ))}
        </div>
      )}

      {playback}
    </PageShell>
  );
}

function InlineChapterSection({
  chapter,
  num,
  versePlayer,
  fullRecording,
}: {
  chapter: DocumentChapter;
  num: (n: number) => string;
  versePlayer: ReturnType<typeof useDocumentPlayback>["versePlayer"];
  fullRecording: ReturnType<typeof useDocumentPlayback>["fullRecordingControls"];
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const title = bilingualText(lang, chapter.title_ne, chapter.title_en);
  const shlokas = chapter.shlokas ?? [];

  return (
    <section
      id={chapter.number != null ? chapterAnchor(chapter.number) : undefined}
      className="scroll-mt-24 space-y-3"
    >
      {chapter.number != null ? (
        <header className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary/10 text-base font-bold tabular-nums text-secondary">
            {num(chapter.number)}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold sm:text-xl">
              {t("documents.chapter_label", { number: num(chapter.number) })}
            </h2>
            {title ? <p className="text-sm text-muted-foreground">{title}</p> : null}
          </div>
        </header>
      ) : null}
      {shlokas.map((shloka) => (
        <ShlokaCard
          key={shloka.id}
          shloka={shloka}
          player={versePlayer}
          fullRecording={fullRecording}
        />
      ))}
    </section>
  );
}

export default DocumentDetail;
