import { useEffect, useMemo } from "react";
import { Link, Navigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
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
  fetchDocumentChapter,
  fetchDocumentDetail,
  type DocumentDetailSearch,
  type Shloka,
} from "@/lib/documents-api";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { suktaAttribution } from "@vedic-patro/domain/sukta-attribution";
import { useRouteLoading } from "@/lib/route-loading";

interface SuktaGroup {
  /** null when this chapter's shlokas carry no sukta_number at all (most documents). */
  suktaNumber: number | null;
  /** Traditional Anukramani attribution for this Sukta — from its first shloka, null until sourced. */
  rishi: string | null;
  devata: string | null;
  chhanda: string | null;
  shlokas: Shloka[];
}

/**
 * Groups a chapter's shlokas by `sukta_number` (e.g. the Rigveda: Mandala →
 * Sukta → rik). Shlokas already arrive in reading order, so this only needs
 * to split on each change of `sukta_number` rather than re-sorting.
 * A document without sukta_number returns a single ungrouped bucket, so the
 * caller doesn't need a separate "flat" render path.
 */
function groupBySukta(shlokas: Shloka[]): SuktaGroup[] {
  const groups: SuktaGroup[] = [];
  for (const shloka of shlokas) {
    const suktaNumber = shloka.sukta_number ?? null;
    const last = groups[groups.length - 1];
    if (last && last.suktaNumber === suktaNumber) {
      last.shlokas.push(shloka);
    } else {
      groups.push({
        suktaNumber,
        rishi: shloka.sukta_rishi ?? null,
        devata: shloka.sukta_devata ?? null,
        chhanda: shloka.sukta_chhanda ?? null,
        shlokas: [shloka],
      });
    }
  }
  return groups;
}

/**
 * One chapter of a chaptered document — verses fetched (and rendered) for
 * this chapter alone, never the whole book. Sibling chapter numbers for the
 * prev/next controls come from the already-cached document summary
 * (`fetchDocumentDetail`), which carries chapter metadata only, not verses.
 */
export function DocumentChapterDetail() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { slug, chapter: chapterParam } = useParams({ strict: false }) as {
    slug?: string;
    chapter?: string;
  };
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const hasValidParams = Boolean(slug) && Number.isFinite(chapterNumber);
  const { category, topic } = useSearch({ strict: false }) as DocumentDetailSearch;

  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
  });

  const chapterQ = useQuery({
    queryKey: documentsKeys.chapter(slug ?? "", chapterNumber),
    queryFn: () => fetchDocumentChapter(slug!, chapterNumber),
    enabled: hasValidParams && !docQ.data?.inline_chapters,
    staleTime: DOCUMENTS_STALE_TIME,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  useRouteLoading(docQ.isLoading || chapterQ.isLoading);

  const data = chapterQ.data;
  const shlokas = useMemo(() => data?.chapter.shlokas ?? [], [data]);
  const suktaGroups = useMemo(() => groupBySukta(shlokas), [shlokas]);
  const { player, versePlayer, fullAudio, mode, startFull, switchToFull, activeShloka } =
    useDocumentPlayback(shlokas, data?.full_audio_url);

  const num = (n: number) => (lang === "ne" ? toNepaliDigits(String(n)) : String(n));

  // Deep link to a specific verse (e.g. from DocumentJumpForm) — scroll to it
  // once this chapter's shlokas have rendered.
  useEffect(() => {
    if (!data) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [data]);

  if (docQ.data?.inline_chapters && slug && Number.isFinite(chapterNumber)) {
    return (
      <Navigate
        to="/documents/$slug"
        params={{ slug }}
        search={category ? documentsListSearch(category, topic) : undefined}
        hash={`chapter-${chapterNumber}`}
        replace
      />
    );
  }

  const backToChaptersLink = hasValidParams ? (
    <Link
      to="/documents/$slug"
      params={{ slug: slug! }}
      search={category ? documentsListSearch(category, topic) : undefined}
      className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {t("documents.back_to_chapters")}
    </Link>
  ) : (
    <Link
      to="/documents"
      search={documentsListSearch("all")}
      className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {t("documents.back_to_list")}
    </Link>
  );

  if (!hasValidParams || (chapterQ.isError && !chapterQ.isLoading)) {
    return (
      <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
        {backToChaptersLink}
        <p className="mt-4 text-sm text-muted-foreground">{t("documents.not_found")}</p>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
        {backToChaptersLink}
      </PageShell>
    );
  }

  const docTitle = bilingualText(lang, data.title_ne, data.title_en);
  const chapterTitle = bilingualText(lang, data.chapter.title_ne, data.chapter.title_en);

  // All chapter numbers of the parent document, in order — for prev/next.
  // Falls back to the current chapter alone if the summary hasn't loaded yet
  // (e.g. a deep link opened straight to this chapter).
  const chapterNumbers = (docQ.data?.chapters ?? [])
    .map((c) => c.number)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const currentIndex = chapterNumbers.indexOf(chapterNumber);
  const prevChapter = currentIndex > 0 ? chapterNumbers[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapterNumbers.length - 1
      ? chapterNumbers[currentIndex + 1]
      : null;

  return (
    <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere] pb-28">
      {backToChaptersLink}

      <header className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-secondary">{docTitle}</p>
          {chapterNumbers.length > 0 ? (
            <p className="text-xs font-semibold text-muted-foreground">
              {t("documents.chapter_progress", {
                current: num(chapterNumber),
                total: num(chapterNumbers.length),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary/10 text-base font-bold tabular-nums text-secondary">
            {num(chapterNumber)}
          </span>
          <h1 className="min-w-0 text-2xl font-bold sm:text-3xl">
            {t("documents.chapter_label", { number: num(chapterNumber) })}
            {chapterTitle ? (
              <span className="mt-0.5 block text-base font-semibold text-muted-foreground sm:text-lg">
                {chapterTitle}
              </span>
            ) : null}
          </h1>
        </div>
      </header>

      <DocumentJumpForm
        slug={slug!}
        category={category}
        topic={topic}
        chapterNumbers={chapterNumbers}
        currentChapter={chapterNumber}
      />

      <div className="space-y-6">
        {suktaGroups.map((group) => (
          <section key={group.suktaNumber ?? "ungrouped"} className="space-y-3">
            {group.suktaNumber != null ? (
              <div>
                <h2 className="text-sm font-bold text-secondary">
                  {t("documents.sukta_label", { number: num(group.suktaNumber) })}
                </h2>
                {group.rishi || group.devata || group.chhanda ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.rishi ? (
                      <span>
                        {t("documents.sukta_rishi")}: {suktaAttribution(lang, group.rishi)}
                      </span>
                    ) : null}
                    {group.devata ? (
                      <span>
                        {group.rishi ? " · " : ""}
                        {t("documents.sukta_devata")}: {suktaAttribution(lang, group.devata)}
                      </span>
                    ) : null}
                    {group.chhanda ? (
                      <span>
                        {group.rishi || group.devata ? " · " : ""}
                        {t("documents.sukta_chhanda")}: {suktaAttribution(lang, group.chhanda)}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ) : null}
            {group.shlokas.map((shloka) => (
              <ShlokaCard key={shloka.id} shloka={shloka} player={versePlayer} />
            ))}
          </section>
        ))}
      </div>

      <nav className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-semibold">
        {prevChapter != null ? (
          <Link
            to="/documents/$slug/$chapter"
            params={{ slug: slug!, chapter: String(prevChapter) }}
            search={category ? documentsListSearch(category, topic) : undefined}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 transition-colors hover:border-secondary/60 hover:text-secondary"
          >
            <ChevronLeft className="size-4" /> {t("documents.prev_chapter")}
          </Link>
        ) : (
          <span />
        )}
        {nextChapter != null ? (
          <Link
            to="/documents/$slug/$chapter"
            params={{ slug: slug!, chapter: String(nextChapter) }}
            search={category ? documentsListSearch(category, topic) : undefined}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 transition-colors hover:border-secondary/60 hover:text-secondary"
          >
            {t("documents.next_chapter")} <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {fullAudio.audioElement}
      <PlaybackBar
        mode={mode}
        hasFullRecording={Boolean(data.full_audio_url)}
        documentTitle={docTitle}
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
    </PageShell>
  );
}

export default DocumentChapterDetail;
