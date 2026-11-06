import { Link, useNavigate, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { VERSE_DETAIL_KINDS } from "@vedic-patro/api-client";
import { isVerseDetailKind, shlokaAnchor, useDocumentLibraryOptions, useVerseDetailList, useVerseDetailValues } from "@vedic-patro/features/documents";
import { useLocale } from "@vedic-patro/i18n/react";
import { PageShell } from "@/components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsListSearch, type VedaVerseDetailSearch } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

const selectClass = documentsClasses.jumpSectionSelect;

/**
 * Every mantra with one देवता / ऋषि / छन्द / स्वर. Two dropdowns drive it: the value
 * (every ऋषि, say) and the granth to look in; the list below is that value's mantras
 * in that granth, each with its reference, its four details and its text.
 */
export function VedaVerseDetail() {
  const navigate = useNavigate();
  const router = useRouter();
  const { t } = useLocale();
  const { kind } = useParams({ strict: false }) as { kind?: string };
  const { value = "", slug } = useSearch({ strict: false }) as VedaVerseDetailSearch;
  const valid = isVerseDetailKind(kind);
  const list = useVerseDetailList(valid ? kind : null, value, slug);
  const library = useDocumentLibraryOptions();
  const values = useVerseDetailValues(valid ? kind : null, slug, value);
  useRouteLoading(list.status === "loading");

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else void navigate({ to: "/documents", search: documentsListSearch("all") });
  };
  const choose = (next: { value?: string; slug?: string }) => {
    if (!valid) return;
    void navigate({ to: "/veda/$kind", params: { kind }, search: { value: next.value ?? value, slug: next.slug === undefined ? slug : next.slug || undefined }, replace: true });
  };

  return (
    <PageShell showRelatedLinks={false}>
      <button type="button" onClick={goBack} className={cn(documentsClasses.backLink, "inline-flex transition-colors hover:text-foreground")}>
        <ArrowLeft className="size-4" /> {list.copy.back}
      </button>

      <header className={cn(documentsClasses.header, "space-y-1.5")}>
        <div className={documentsClasses.chapterTitleRow}>
          <p className={documentsClasses.headerSanskrit}>{list.copy.kindLabel}</p>
          {list.status === "ready" ? <p className={documentsClasses.chapterProgress}>{list.copy.count}</p> : null}
        </div>
        <h1 className={documentsClasses.chapterTitle}>{value}</h1>
      </header>

      <div className={documentsClasses.jumpForm}>
        <label className={cn(documentsClasses.jumpField, documentsClasses.jumpSectionField)}>
          <span className={documentsClasses.jumpLabel}>{list.copy.kindLabel}</span>
          <select value={value} onChange={(e) => choose({ value: e.target.value })} aria-label={list.copy.kindLabel} className={selectClass}>
            {values.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className={cn(documentsClasses.jumpField, documentsClasses.jumpSectionField)}>
          <span className={documentsClasses.jumpLabel}>{t("documents.jump_document_label")}</span>
          <select value={slug ?? ""} onChange={(e) => choose({ slug: e.target.value })} aria-label={t("documents.jump_document_label")} className={selectClass}>
            <option value="">{list.copy.allGranth}</option>
            {library.map((doc) => (
              <option key={doc.slug} value={doc.slug}>
                {doc.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.status === "ready" && list.rows.length === 0 ? <p className="text-muted-foreground">{list.copy.empty}</p> : null}
      <div className="space-y-2">
        {list.rows.map((row) => {
          const link = {
            to: row.chapter != null ? "/documents/$slug/$chapter" : "/documents/$slug",
            params: row.chapter != null ? { slug: row.slug, chapter: String(row.chapter) } : { slug: row.slug },
            hash: shlokaAnchor(row.label),
          } as const;
          return (
            <section key={row.key} className={cn(documentsClasses.verseCard, documentsClasses.verseIdle)}>
              <div className={documentsClasses.verseMetaLine}>
                <Link {...link} className={cn(documentsClasses.verseNumber, "hover:text-secondary")}>
                  {row.reference}
                </Link>
                {VERSE_DETAIL_KINDS.map((k) => {
                  const v = row.verse[k];
                  if (!v) return null;
                  return (
                    <Link
                      key={k}
                      to="/veda/$kind"
                      params={{ kind: k }}
                      search={{ value: v, slug }}
                      className={cn(documentsClasses.verseChip, "hover:bg-secondary/20", k === kind && "ring-1 ring-secondary/50")}
                    >
                      <span className={documentsClasses.verseChipLabel}>{t(`documents.detail_${k}`)}</span>
                      <span className={documentsClasses.verseChipValue}>{v}</span>
                    </Link>
                  );
                })}
              </div>
              <Link {...link} className="block">
                <p className={cn(documentsClasses.verseTextWeb, "whitespace-normal")}>{row.verse.sanskrit}</p>
              </Link>
            </section>
          );
        })}
      </div>
      {list.hasMore ? (
        <button
          type="button"
          onClick={list.loadMore}
          disabled={list.loadingMore}
          className={cn(documentsClasses.pagerButton, "mx-auto mt-6 inline-flex transition-colors hover:border-secondary/60 hover:text-secondary")}
        >
          {list.copy.loadMore}
        </button>
      ) : null}
    </PageShell>
  );
}

export default VedaVerseDetail;
