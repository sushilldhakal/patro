import { test } from "node:test";
import assert from "node:assert/strict";
import type { NewsStory } from "@vedic-patro/api-client";
import { agoLabel, newsCardView } from "../src/news/model";

const text = { t: (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k), digits: (s: string | number) => String(s) };
const now = 1_800_000_000_000;

test("agoLabel steps from now to minutes, hours and days", () => {
  assert.equal(agoLabel(now / 1000 - 20, now, text), "news.ago.now");
  assert.equal(agoLabel(now / 1000 - 5 * 60, now, text), 'news.ago.minutes:{"count":"5"}');
  assert.equal(agoLabel(now / 1000 - 3 * 3600, now, text), 'news.ago.hours:{"count":"3"}');
  assert.equal(agoLabel(now / 1000 - 50 * 3600, now, text), 'news.ago.days:{"count":"2"}');
  assert.equal(agoLabel(now / 1000 + 600, now, text), "news.ago.now", "a clock ahead of the server is not negative");
});

test("newsCardView counts outlets only when there are several", () => {
  const story: NewsStory = {
    id: "abc",
    title: "T",
    summary: null,
    language: "ne",
    category: "sports",
    published_at: now / 1000 - 3600,
    updated_at: now / 1000 - 60,
    sources: [{ name: "A", url: "https://a.example/1", published_at: 0 }],
  };
  assert.equal(newsCardView(story, now, text).sourcesCount, null);
  const two = newsCardView({ ...story, sources: [...story.sources, { name: "B", url: "https://b.example/1", published_at: 0 }] }, now, text);
  assert.equal(two.sourcesCount, 'news.sources_count:{"count":"2"}');
  assert.equal(two.category, "news.category.sports");
  assert.equal(two.sources[1]?.label, 'news.open_source:{"name":"B"}');
});
