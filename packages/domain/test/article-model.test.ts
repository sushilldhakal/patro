import assert from "node:assert/strict";
import { test } from "node:test";
import type { ArticleData } from "../src/learn/article-schema.ts";
import {
  eyebrowLabel,
  formulaUnit,
  parseInlineMarkup,
  resolveArticle,
  resolveSeeAlso,
} from "../src/learn/article-model.ts";

test("inline markup keeps markers in order and leaves unmatched marks as text", () => {
  assert.deepEqual(parseInlineMarkup("plain **bold** *teal* ~amber~ `12` [[tithi|Tithi]] end"), [
    { kind: "text", text: "plain " },
    { kind: "strong", text: "bold" },
    { kind: "text", text: " " },
    { kind: "teal", text: "teal" },
    { kind: "text", text: " " },
    { kind: "amber", text: "amber" },
    { kind: "text", text: " " },
    { kind: "num", text: "12" },
    { kind: "text", text: " " },
    { kind: "link", slug: "tithi", label: "Tithi" },
    { kind: "text", text: " end" },
  ]);
  assert.deepEqual(parseInlineMarkup("a *b"), [{ kind: "text", text: "a *b" }]);
  assert.deepEqual(parseInlineMarkup("**bold**"), [{ kind: "strong", text: "bold" }]);
});

test("a formula unit sits flush against degrees and percent", () => {
  assert.equal(formulaUnit("°"), "°");
  assert.equal(formulaUnit("%"), "%");
  assert.equal(formulaUnit("days"), " days");
});

test("an English-only eyebrow drops out of Nepali", () => {
  assert.equal(eyebrowLabel("en", "Orbit"), "Orbit");
  assert.equal(eyebrowLabel("ne", "Orbit"), null);
  assert.equal(eyebrowLabel("en", { ne: "कक्षा", en: "Orbit" }), "Orbit");
  assert.equal(eyebrowLabel("ne", { ne: "कक्षा", en: "" }), "कक्षा");
});

test("resolveArticle numbers sections from the offset and picks the language", () => {
  const article: ArticleData = {
    slug: "sample",
    seeAlso: ["bikram-sambat", "missing-slug"],
    sections: [
      {
        title: { ne: "शीर्षक", en: "Title" },
        eyebrow: "English only",
        blocks: [
          { kind: "lede", text: { ne: "नेपाली", en: "A *term* and [[bikram-sambat|day]]" } },
          { kind: "list", ordered: true, items: [{ ne: "एक", en: "One" }] },
        ],
      },
    ],
  };
  const [section] = resolveArticle(article, "en", 2);
  assert.equal(section?.kicker, "03");
  assert.equal(section?.title, "Title");
  assert.equal(section?.gloss, "English only");
  assert.equal(section?.blocks[0]?.kind, "lede");
  assert.deepEqual(section?.blocks[0]?.kind === "lede" ? section.blocks[0].text : [], [
    { kind: "text", text: "A " },
    { kind: "teal", text: "term" },
    { kind: "text", text: " and " },
    { kind: "link", slug: "bikram-sambat", label: "day" },
  ]);
  assert.deepEqual(section?.blocks[1], {
    kind: "list",
    ordered: true,
    items: [{ key: "One", marker: "1.", text: [{ kind: "text", text: "One" }] }],
  });
  const hidden = resolveArticle(article, "ne", 0)[0];
  assert.equal(hidden?.gloss, null);
  assert.equal(hidden?.kicker, "०१");
  assert.deepEqual(
    resolveSeeAlso(article.seeAlso, "en").map((item) => item.slug),
    ["bikram-sambat"],
  );
});
