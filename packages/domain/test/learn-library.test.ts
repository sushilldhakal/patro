import assert from "node:assert/strict";
import { test } from "node:test";
import { DATA_ARTICLES } from "../src/learn/articles/index.ts";
import { DIAGRAM_IDS } from "../src/learn/diagram-ids.ts";
import { assertLearnLibrary, buildLearnViews, LEARN_LIBRARY, LEARN_SECTIONS } from "../src/learn/learn-library.ts";
import { MERGED_PAGES, RETIRED_SLUG_REDIRECTS } from "../src/learn/merged-pages.ts";
import { ARTICLE_SPLITS } from "../src/learn/articles/regroup.ts";
import { playgroundFor } from "../src/learn/playground-config.ts";
import { parseInlineMarkup } from "../src/learn/article-model.ts";

const views = buildLearnViews(LEARN_SECTIONS, LEARN_LIBRARY);

test("the learn library has no duplicate or unknown sections", () => {
  assert.doesNotThrow(() => assertLearnLibrary(LEARN_SECTIONS, LEARN_LIBRARY));
});

test("a published guide is never also a redirect", () => {
  for (const topic of views.published) {
    assert.equal(RETIRED_SLUG_REDIRECTS[topic.slug], undefined, topic.slug);
  }
});

test("every published guide has a body", () => {
  for (const topic of views.published) {
    const merged = MERGED_PAGES.some((page) => page.slug === topic.slug);
    assert.ok(merged || DATA_ARTICLES[topic.slug], topic.slug);
  }
});

test("every merged chapter has a body", () => {
  const diagrams = new Set<string>(DIAGRAM_IDS);
  for (const page of MERGED_PAGES) {
    assert.equal(views.bySlug[page.slug]?.status, "published", page.slug);
    for (const part of page.parts) {
      if (part.slug === "history") continue;
      const article = DATA_ARTICLES[part.slug];
      assert.ok(article, `missing article for ${page.slug}#${part.slug}`);
      for (const section of article.sections) {
        for (const block of section.blocks) {
          if (block.kind === "diagram") assert.ok(diagrams.has(block.id), block.id);
        }
      }
    }
  }
});

test("the course runs nature → calendar → computation → history", () => {
  assert.deepEqual(
    LEARN_SECTIONS.map((section) => section.id),
    ["start", "earth-sky", "sun", "moon", "panchanga", "calculation", "deeper", "comparison"],
  );
  assert.deepEqual(
    views.published.map((topic) => topic.slug).slice(0, 7),
    ["bikram-sambat", "earth-rotation-day", "solar-system", "celestial-sphere", "sky-rotation", "why-seasons", "sayana-nirayana-year"],
  );
  /* Published topics run section by section, never doubling back. */
  const order = LEARN_SECTIONS.map((section) => section.id);
  const sectionIndex = views.published.map((topic) => order.indexOf(topic.section));
  assert.deepEqual(sectionIndex, [...sectionIndex].sort((a, b) => a - b));
  assert.equal(RETIRED_SLUG_REDIRECTS["five-limbs-together"], "what-is-panchang#five-limbs-together");
  assert.equal(RETIRED_SLUG_REDIRECTS["choghadiya"], "hora#choghadiya");
});

test("every split article section lands in exactly one chapter", () => {
  for (const { source, pieces } of ARTICLE_SPLITS) {
    const used = pieces.flatMap((piece) => piece.sections).sort((a, b) => a - b);
    assert.deepEqual(used, source.sections.map((_, i) => i), source.slug);
  }
});

test("each article is read in one place only", () => {
  const seen = new Map<string, string>();
  const place = (slug: string, where: string) => {
    assert.equal(seen.get(slug), undefined, `${slug} is in both ${seen.get(slug)} and ${where}`);
    seen.set(slug, where);
  };
  for (const page of MERGED_PAGES) for (const part of page.parts) place(part.slug, page.slug);
  for (const topic of views.published) if (!MERGED_PAGES.some((page) => page.slug === topic.slug)) place(topic.slug, topic.slug);
});

test("every retired slug lands on a published page and a chapter that exists", () => {
  for (const [from, to] of Object.entries(RETIRED_SLUG_REDIRECTS)) {
    const [page, anchor] = to.split("#") as [string, string | undefined];
    assert.equal(views.bySlug[page]?.status, "published", `${from} → ${to}`);
    if (anchor) {
      const merged = MERGED_PAGES.find((p) => p.slug === page);
      assert.ok(merged?.parts.some((part) => part.slug === anchor), `${from} → ${to}`);
    }
  }
});

test("only published topics are shown; drafts and planned topics count as upcoming", () => {
  const v = buildLearnViews(
    [{ id: "s" }],
    [
      { slug: "a", section: "s", status: "published" },
      { slug: "b", section: "s", status: "draft" },
      { slug: "c", section: "s", status: "planned" },
    ],
  );
  assert.deepEqual(v.publishedInSection("s").map((t) => t.slug), ["a"]);
  assert.deepEqual(v.upcomingInSection("s").map((t) => t.slug), ["b", "c"]);
  assert.deepEqual(v.adjacentPublished("a"), { prev: null, next: null });
});

test("every diagram is shown exactly once on the pages readers can see", () => {
  /* A page that runs a guided tour shows the tour in place of its prose. */
  const visible = views.published.filter((topic) => !playgroundFor(topic.slug)?.guided);
  const shown = new Map<string, string[]>();
  for (const topic of visible) {
    const merged = MERGED_PAGES.find((page) => page.slug === topic.slug);
    for (const slug of merged ? merged.parts.map((part) => part.slug) : [topic.slug]) {
      for (const section of DATA_ARTICLES[slug]?.sections ?? []) {
        for (const block of section.blocks) {
          if (block.kind === "diagram") shown.set(block.id, [...(shown.get(block.id) ?? []), `${topic.slug}#${slug}`]);
        }
      }
    }
  }
  /* A repeat should be a link to the chapter that holds the diagram, not a second copy. */
  for (const [id, places] of shown) assert.equal(places.length, 1, `${id} appears at ${places.join(", ")}`);
  /* And nothing an article draws is left only on a page nobody sees. */
  for (const article of Object.values(DATA_ARTICLES)) {
    for (const section of article?.sections ?? []) {
      for (const block of section.blocks) {
        if (block.kind === "diagram") assert.ok(shown.has(block.id), `${block.id} (in ${article?.slug}) is not shown anywhere`);
      }
    }
  }
});

test("every [[link]] in an article opens a published page, and none is swallowed by other markup", () => {
  const strings: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  for (const article of Object.values(DATA_ARTICLES)) {
    strings.length = 0;
    walk(article?.sections);
    for (const text of strings) {
      for (const part of parseInlineMarkup(text)) {
        if (part.kind === "link") {
          const target = views.bySlug[part.slug]?.status === "published" ? part.slug : RETIRED_SLUG_REDIRECTS[part.slug];
          assert.ok(target, `${article?.slug} links to unknown "${part.slug}"`);
        } else {
          assert.ok(!part.text.includes("[["), `${article?.slug}: a link inside other markup — ${part.text.slice(0, 60)}`);
        }
      }
    }
  }
});
