import assert from "node:assert/strict";
import { test } from "node:test";
import { DATA_ARTICLES } from "../src/learn/articles/index.ts";
import { DIAGRAM_IDS } from "../src/learn/diagram-ids.ts";
import { assertLearnLibrary, buildLearnViews, LEARN_LIBRARY, LEARN_SECTIONS } from "../src/learn/learn-library.ts";
import { MERGED_PAGES, RETIRED_SLUG_REDIRECTS } from "../src/learn/merged-pages.ts";

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

test("the course opens with the patro, then a surface panchanga, then each limb", () => {
  assert.deepEqual(
    views.published.map((topic) => topic.slug).slice(0, 9),
    [
      "bikram-sambat",
      "what-is-panchang",
      "tithi",
      "nakshatra",
      "yoga",
      "karana",
      "vara",
      "choghadiya",
      "hora",
    ],
  );
  assert.equal(RETIRED_SLUG_REDIRECTS["five-limbs-together"], "what-is-panchang#five-limbs-together");
  assert.equal(views.bySlug["tithi"]?.section, "panchanga");
  assert.equal(views.bySlug["nakshatra"]?.section, "panchanga");
  assert.equal(views.bySlug["choghadiya"]?.section, "panchanga");
});
