import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ChevronRight, LayoutGrid, List, Search, X } from "lucide-react";
import {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocumentDetail,
  type DocumentSummary,
} from "@vedic-patro/api-client";
import { bilingual, useDocumentCard, type DocumentsSection, type DocumentsTopicSet } from "@vedic-patro/features/documents";
import { categoryGroup } from "@vedic-patro/domain/learn/document-categories";
import { useLocale } from "@vedic-patro/i18n/react";
import { DocumentCard } from "@vedic-patro/ui/kit/jyotish";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { documentsListSearch, type DocumentCategoryTab, type DocumentsViewMode } from "@/lib/documents-api";

const HOVER_ROW = "transition-colors hover:bg-card";
const HOVER_CARD = "transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md";
const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// ── Toolbar ────────────────────────────────────────────────────────────────

/** Search box + card/list switch, the row above every library view. */
export function DocumentsToolbar({
  search,
  onSearch,
  placeholder,
  clearLabel,
  view,
  onView,
  gridLabel,
  listLabel,
  viewLabel,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  view: DocumentsViewMode;
  onView: (view: DocumentsViewMode) => void;
  gridLabel: string;
  listLabel: string;
  viewLabel: string;
}) {
  return (
    <div className={documentsClasses.toolbar}>
      <label className={documentsClasses.searchBox}>
        <Search className={documentsClasses.searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onSearch("");
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(documentsClasses.searchInput, FOCUS, "placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden")}
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label={clearLabel}
            className={cn(documentsClasses.searchClear, "hover:bg-muted hover:text-foreground")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>
      <div className={documentsClasses.viewToggle} role="group" aria-label={viewLabel}>
        {(
          [
            ["grid", gridLabel, LayoutGrid],
            ["list", listLabel, List],
          ] as const
        ).map(([mode, label, Icon]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            aria-label={label}
            title={label}
            onClick={() => onView(mode)}
            className={cn(documentsClasses.viewBtn, view === mode ? documentsClasses.viewBtnActive : cn(documentsClasses.viewBtnIdle, "hover:text-foreground"))}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Breadcrumb + category switcher ─────────────────────────────────────────

export type Crumb = { label: string; category: DocumentCategoryTab };

/** "Library › Katha › Satyanarayan" — every step but the last is a link back into the library. */
export function DocumentsBreadcrumb({ crumbs, current, view }: { crumbs: Crumb[]; current?: string; view?: DocumentsViewMode }) {
  const { t } = useLocale();
  return (
    <nav aria-label={t("documents.breadcrumb_label")} className={documentsClasses.crumbs}>
      {crumbs.map((crumb, i) => (
        <span key={crumb.category} className="inline-flex min-w-0 items-center gap-1">
          {i > 0 ? <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /> : null}
          <Link
            to="/documents"
            search={documentsListSearch(crumb.category, undefined, view)}
            className={cn(documentsClasses.crumbLink, "transition-colors hover:text-secondary")}
          >
            {crumb.label}
          </Link>
        </span>
      ))}
      {current ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
          <span className={documentsClasses.crumbCurrent} aria-current="page">
            {current}
          </span>
        </span>
      ) : null}
    </nav>
  );
}

/** One scrolling row of category chips — quick hops between groups without going back to the hub. */
export function DocumentCategoryChips({
  tabs,
  label,
  view,
}: {
  tabs: { id: DocumentCategoryTab; label: string; active: boolean; countLabel?: string }[];
  label: string;
  view: DocumentsViewMode;
}) {
  return (
    <nav aria-label={label} className={documentsClasses.chipStrip}>
      {tabs.map((tab) => {
        const group = tab.id === "all" ? undefined : categoryGroup(tab.id);
        return (
          <Link
            key={tab.id}
            to="/documents"
            search={documentsListSearch(tab.id, undefined, view)}
            replace
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              documentsClasses.chip,
              "transition-colors",
              tab.active ? documentsClasses.chipActive : cn(documentsClasses.chipIdle, "hover:border-secondary/50 hover:text-foreground"),
            )}
          >
            {group ? <span aria-hidden="true">{group.emoji}</span> : null}
            {tab.label}
            {tab.countLabel ? <span className={documentsClasses.chipCount}>{tab.countLabel}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Hub (category cards) ───────────────────────────────────────────────────

/** The library's front page in card view: one card per category, with its first few titles. */
export function DocumentCategoryHub({
  sections,
  view,
  countLabel,
  openLabel,
}: {
  sections: DocumentsSection[];
  view: DocumentsViewMode;
  countLabel: (count: number) => string;
  openLabel: string;
}) {
  return (
    <div className={documentsClasses.hubGrid}>
      {sections.map((section) => (
        <Link
          key={section.group.id}
          to="/documents"
          search={documentsListSearch(section.group.id, undefined, view)}
          className={cn(documentsClasses.hubCard, HOVER_CARD, FOCUS)}
        >
          <div className={documentsClasses.hubCardTop}>
            <span className={documentsClasses.hubEmoji} aria-hidden="true">
              {section.group.emoji}
            </span>
            <div className="min-w-0">
              <h2 className={documentsClasses.hubTitle}>{section.name}</h2>
              <p className={documentsClasses.hubCount}>{countLabel(section.count)}</p>
            </div>
          </div>
          {section.blurb ? <p className={documentsClasses.hubBlurb}>{section.blurb}</p> : null}
          <ul className={documentsClasses.hubPreview}>
            {section.preview.map((title) => (
              <li key={title} className={documentsClasses.hubPreviewItem}>
                <span className={documentsClasses.hubPreviewDot} aria-hidden="true" />
                <span className="truncate">{title}</span>
              </li>
            ))}
            {section.moreLabel ? <li className={documentsClasses.hubMore}>{section.moreLabel}</li> : null}
          </ul>
          <span className={cn(documentsClasses.hubOpen, "mt-auto")}>
            {openLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Header of one open category: its emoji, name, blurb and count. */
export function DocumentCategoryHero({ section, countLabel }: { section: DocumentsSection; countLabel: string }) {
  return (
    <header className={documentsClasses.categoryHero}>
      <span className={documentsClasses.categoryHeroEmoji} aria-hidden="true">
        {section.group.emoji}
      </span>
      <div className="min-w-0">
        <h2 className={documentsClasses.categoryHeroTitle}>{section.name}</h2>
        {section.blurb ? <p className={documentsClasses.categoryHeroBlurb}>{section.blurb}</p> : null}
        <p className={documentsClasses.categoryHeroCount}>{countLabel}</p>
      </div>
    </header>
  );
}

// ── Topics (inside a category) ─────────────────────────────────────────────

/**
 * The open group's topics. A canonical list (the eighteen Mahapuranas) is drawn
 * as numbered tiles, every one shown whether or not a text is filed under it
 * yet; other topic lists are chips. A filed topic filters the group; picking it
 * again clears the filter.
 */
export function DocumentTopicPanel({
  sets,
  category,
  view,
  resetLabel,
  showReset,
}: {
  sets: DocumentsTopicSet[];
  category: DocumentCategoryTab;
  view: DocumentsViewMode;
  resetLabel: string;
  showReset: boolean;
}) {
  if (sets.length === 0) return null;
  return (
    <section className={documentsClasses.topicPanel}>
      {sets.map((set, i) => (
        <div key={set.id || "topics"} className="space-y-2.5">
          <div className={documentsClasses.topicSetHead}>
            <h3 className={documentsClasses.sectionLabel}>{set.title}</h3>
            {showReset && i === 0 ? (
              <Link to="/documents" search={documentsListSearch(category, undefined, view)} replace className={cn(documentsClasses.topicReset, "hover:opacity-80")}>
                <X className="size-3.5" aria-hidden="true" />
                {resetLabel}
              </Link>
            ) : null}
          </div>
          <div className={set.numbered ? documentsClasses.topicGrid : documentsClasses.topicChips}>
            {set.topics.map((topic) => {
              const filed = topic.count > 0;
              const to = topic.opens
                ? documentsListSearch(topic.opens, undefined, view)
                : documentsListSearch(category, topic.active ? undefined : topic.id, view);
              if (!set.numbered) {
                const chipClass = cn(
                  documentsClasses.chip,
                  topic.active ? documentsClasses.chipActive : filed ? cn(documentsClasses.chipIdle, "hover:border-secondary/50 hover:text-foreground") : documentsClasses.topicChipEmpty,
                );
                return filed ? (
                  <Link key={topic.id} to="/documents" search={to} replace={!topic.opens} aria-current={topic.active ? "true" : undefined} className={cn(chipClass, "transition-colors")}>
                    {topic.label}
                    <span className={documentsClasses.chipCount}>{topic.count}</span>
                  </Link>
                ) : (
                  <span key={topic.id} className={chipClass} title={topic.countLabel}>
                    {topic.label}
                  </span>
                );
              }
              const body = (
                <>
                  <span className="flex flex-row items-center gap-2">
                    <span className={documentsClasses.topicNum}>{topic.numberLabel}</span>
                    <span className={cn(documentsClasses.topicName, "min-w-0 truncate")}>{topic.label}</span>
                  </span>
                  <span className={cn(documentsClasses.topicCount, "pl-8")}>{topic.countLabel}</span>
                </>
              );
              return filed ? (
                <Link
                  key={topic.id}
                  to="/documents"
                  search={to}
                  replace={!topic.opens}
                  aria-current={topic.active ? "true" : undefined}
                  className={cn(
                    documentsClasses.topicTile,
                    topic.active ? documentsClasses.topicTileActive : cn(documentsClasses.topicTileIdle, "hover:border-secondary/50"),
                    "transition-colors",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div key={topic.id} className={cn(documentsClasses.topicTile, documentsClasses.topicTileEmpty)}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

// ── Document cards (inside a category) ─────────────────────────────────────

export function DocumentCategoryGrid({
  documents,
  category,
  view,
}: {
  documents: DocumentSummary[];
  category: DocumentCategoryTab;
  view?: DocumentsViewMode;
}) {
  const navigate = useNavigate();
  if (documents.length === 0) return null;
  return (
    <div className={documentsClasses.hubGrid}>
      {documents.map((doc) => (
        <DocumentCard
          key={doc.slug}
          doc={doc}
          category={category === "all" ? undefined : category}
          onPress={() =>
            navigate({
              to: "/documents/$slug",
              params: { slug: doc.slug },
              search: documentsListSearch(category, undefined, view),
            })
          }
        />
      ))}
    </div>
  );
}

// ── List view: category → document → chapters ─────────────────────────────

function DocRowBody({ doc, showCategory, trailing }: { doc: DocumentSummary; showCategory?: boolean; trailing: ReactNode }) {
  const { lang } = useLocale();
  const card = useDocumentCard(doc);
  const group = showCategory ? categoryGroup(doc.category) : undefined;
  return (
    <>
      <span className={documentsClasses.listDocIcon} aria-hidden="true">
        <BookOpen className="size-4" />
      </span>
      <span className={documentsClasses.listDocText}>
        <span className={cn(documentsClasses.listDocTitle, "block")}>{card.title}</span>
        {card.subtitle ? <span className={cn(documentsClasses.listDocSub, "block")}>{card.subtitle}</span> : null}
      </span>
      {group ? (
        <span className={cn(documentsClasses.listCategoryTag, "hidden sm:inline")}>
          {group.emoji} {bilingual(lang, group.ne, group.en)}
        </span>
      ) : null}
      <span className={cn(documentsClasses.listDocMeta, "hidden sm:inline")}>{card.meta.join(" · ")}</span>
      {trailing}
    </>
  );
}

/**
 * One document as a list row. A document split into chapters opens like an
 * accordion to list them (fetched on first open); any other opens the reader.
 */
function DocumentListRow({
  doc,
  category,
  view,
  showCategory,
}: {
  doc: DocumentSummary;
  category: DocumentCategoryTab;
  view?: DocumentsViewMode;
  showCategory?: boolean;
}) {
  const { lang, digits, t } = useLocale();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: documentsKeys.detail(doc.slug),
    queryFn: () => fetchDocumentDetail(doc.slug),
    enabled: open && doc.has_chapters,
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const search = documentsListSearch(category, undefined, view);

  if (!doc.has_chapters) {
    return (
      <Link
        to="/documents/$slug"
        params={{ slug: doc.slug }}
        search={search}
        className={cn(documentsClasses.listDocRow, HOVER_ROW, "group")}
      >
        <DocRowBody
          doc={doc}
          showCategory={showCategory}
          trailing={<ChevronRight className={documentsClasses.rowChevron} aria-hidden="true" />}
        />
      </Link>
    );
  }

  const chapters = (query.data?.chapters ?? []).filter((c) => c.number != null);

  return (
    <Accordion type="single" collapsible onValueChange={(v) => setOpen(Boolean(v))}>
      <AccordionItem value={doc.slug} className="border-0">
        <AccordionTrigger className={cn(documentsClasses.listDocRow, HOVER_ROW, "items-center hover:no-underline")}>
          <DocRowBody doc={doc} showCategory={showCategory} trailing={null} />
        </AccordionTrigger>
        <AccordionContent className="pb-2 [&_a]:no-underline">
          <Link to="/documents/$slug" params={{ slug: doc.slug }} search={search} className={cn(documentsClasses.listOpenRow, "hover:opacity-80")}>
            {t("documents.open_document")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          <div className={documentsClasses.listChapters}>
            {query.isLoading
              ? Array.from({ length: 4 }, (_, i) => <span key={i} className="h-7 animate-pulse rounded-lg bg-muted" />)
              : chapters.map((ch) => {
                  const n = ch.number!;
                  const title = bilingual(lang, ch.title_ne, ch.title_en) || t("documents.chapter_label", { number: digits(n) });
                  const body = (
                    <>
                      <span className={documentsClasses.listChapterNum}>{digits(n)}</span>
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                    </>
                  );
                  const rowClass = cn(documentsClasses.listChapterRow, "hover:bg-card hover:text-foreground");
                  return doc.inline_chapters ? (
                    <Link key={n} to="/documents/$slug" params={{ slug: doc.slug }} search={search} hash={`chapter-${n}`} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <Link key={n} to="/documents/$slug/$chapter" params={{ slug: doc.slug, chapter: String(n) }} search={search} className={rowClass}>
                      {body}
                    </Link>
                  );
                })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** A plain list of documents (one category, or search results across the library). */
export function DocumentRows({
  documents,
  category,
  view,
  showCategory,
}: {
  documents: DocumentSummary[];
  category: DocumentCategoryTab;
  view?: DocumentsViewMode;
  showCategory?: boolean;
}) {
  return (
    <div className={documentsClasses.listShell}>
      <div className={cn(documentsClasses.listBody, "border-t-0 bg-transparent")}>
        {documents.map((doc) => (
          <DocumentListRow key={doc.slug} doc={doc} category={showCategory ? doc.category : category} view={view} showCategory={showCategory} />
        ))}
      </div>
    </div>
  );
}

/** The whole library as nested accordions: category → document → chapters. */
export function DocumentLibraryList({
  sections,
  view,
  countLabel,
}: {
  sections: DocumentsSection[];
  view?: DocumentsViewMode;
  countLabel: (count: number) => string;
}) {
  return (
    <div className={documentsClasses.listShell}>
      <Accordion type="multiple" className="w-full">
        {sections.map((section) => (
          <AccordionItem key={section.group.id} value={section.group.id} className={documentsClasses.listItem}>
            <AccordionTrigger className={cn(documentsClasses.listTrigger, "items-center hover:bg-muted/30 hover:no-underline")}>
              <span className={documentsClasses.listTriggerEmoji} aria-hidden="true">
                {section.group.emoji}
              </span>
              <span className={documentsClasses.listTriggerTitle}>{section.name}</span>
              <span className={documentsClasses.listTriggerMeta}>{countLabel(section.count)}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className={documentsClasses.listBody}>
                {section.documents.map((doc) => (
                  <DocumentListRow key={doc.slug} doc={doc} category={section.group.id} view={view} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
