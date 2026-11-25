//! News headlines from publishers' RSS feeds, grouped into stories.
//!
//! The feeds are read every few minutes and kept in memory: no database, no AI.
//! A story is the same event reported by several outlets, found by comparing
//! headline words. Readers get the headline, the outlet's own feed summary and a
//! link to each outlet's article; publisher images are not used.

use std::{
    collections::{HashMap, HashSet},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::sync::{Mutex, RwLock};

/// A feed is read again once the stored copy is this old.
const REFRESH_AFTER: Duration = Duration::from_secs(10 * 60);
/// Items older than this drop out of the feed.
const KEEP_SECS: i64 = 3 * 24 * 3600;
/// Upper bound on stored items, so a broken feed cannot grow memory.
const MAX_ITEMS: usize = 2_000;
/// Feeds larger than this are skipped.
const MAX_FEED_BYTES: usize = 4 * 1024 * 1024;
/// Feed summaries are cut to this many characters.
const SUMMARY_CHARS: usize = 280;
/// Two headlines more than this far apart in time are never the same story.
const GROUP_WINDOW_SECS: i64 = 36 * 3600;

/// One publisher feed. Every listed site allows general crawlers on its feed in `robots.txt`.
#[derive(Debug, Clone, Copy)]
struct Feed {
    name: &'static str,
    url: &'static str,
    language: &'static str,
}

const FEEDS: &[Feed] = &[
    Feed {
        name: "Onlinekhabar",
        url: "https://www.onlinekhabar.com/feed",
        language: "ne",
    },
    Feed {
        name: "Setopati",
        url: "https://www.setopati.com/feed",
        language: "ne",
    },
    Feed {
        name: "Ratopati",
        url: "https://www.ratopati.com/feed",
        language: "ne",
    },
    Feed {
        name: "BBC Nepali",
        url: "https://feeds.bbci.co.uk/nepali/rss.xml",
        language: "ne",
    },
    Feed {
        name: "Gorkhapatra",
        url: "https://gorkhapatraonline.com/rss",
        language: "ne",
    },
    Feed {
        name: "Baahrakhari",
        url: "https://baahrakhari.com/feed",
        language: "ne",
    },
    Feed {
        name: "Deshsanchar",
        url: "https://www.deshsanchar.com/feed",
        language: "ne",
    },
    Feed {
        name: "Nagarik",
        url: "https://nagariknews.nagariknetwork.com/feed",
        language: "ne",
    },
    Feed {
        name: "Ujyaalo",
        url: "https://www.ujyaaloonline.com/feed",
        language: "ne",
    },
    Feed {
        name: "Annapurna Post",
        url: "https://www.annapurnapost.com/rss",
        language: "ne",
    },
    Feed {
        name: "Thaha Khabar",
        url: "https://www.thahakhabar.com/feed",
        language: "ne",
    },
    Feed {
        name: "Himal Khabar",
        url: "https://www.himalkhabar.com/feed",
        language: "ne",
    },
    Feed {
        name: "Khabarhub",
        url: "https://www.khabarhub.com/feed",
        language: "ne",
    },
    Feed {
        name: "Image Khabar",
        url: "https://www.imagekhabar.com/feed",
        language: "ne",
    },
    Feed {
        name: "Onlinekhabar English",
        url: "https://english.onlinekhabar.com/feed",
        language: "en",
    },
    Feed {
        name: "The Kathmandu Post",
        url: "https://kathmandupost.com/rss",
        language: "en",
    },
    Feed {
        name: "The Himalayan Times",
        url: "https://thehimalayantimes.com/rssFeed/15",
        language: "en",
    },
    Feed {
        name: "The Rising Nepal",
        url: "https://risingnepaldaily.com/rss",
        language: "en",
    },
];

/// Story categories, in the order the apps show them. `news` is the catch-all.
pub const CATEGORIES: &[&str] = &[
    "news",
    "politics",
    "economy",
    "world",
    "sports",
    "entertainment",
    "technology",
    "health",
];

/// One headline as a publisher's feed gave it.
#[derive(Debug, Clone)]
struct Item {
    source: &'static str,
    language: &'static str,
    title: String,
    link: String,
    summary: Option<String>,
    category: &'static str,
    published: i64,
}

/// One outlet's article inside a story.
#[derive(Debug, Clone, Serialize)]
pub struct SourceLink {
    /// Outlet name.
    pub name: &'static str,
    /// The outlet's article; the apps open it in the browser.
    pub url: String,
    /// When the outlet published it (Unix seconds).
    pub published_at: i64,
}

/// One event, with every outlet that reported it.
#[derive(Debug, Clone, Serialize)]
pub struct Story {
    /// Stable id: a hash of the first outlet's link.
    pub id: String,
    /// The first outlet's headline.
    pub title: String,
    /// The first feed summary any outlet gave, if any.
    pub summary: Option<String>,
    /// `ne` or `en`.
    pub language: &'static str,
    /// One of [`CATEGORIES`].
    pub category: &'static str,
    /// The first report (Unix seconds).
    pub published_at: i64,
    /// The latest report; the feed is ordered by this (Unix seconds).
    pub updated_at: i64,
    /// Every outlet's article, earliest first.
    pub sources: Vec<SourceLink>,
}

/// The grouped stories at one moment, newest first.
#[derive(Debug, Default)]
pub struct Snapshot {
    /// Stories ordered by `updated_at` then `id`, both descending.
    pub stories: Vec<Story>,
    /// When the feeds were last read (Unix seconds); 0 before the first read.
    pub fetched_at: i64,
}

/// The shared news reader. Clones share one store.
#[derive(Debug, Clone)]
pub struct NewsService {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    client: reqwest::Client,
    items: Mutex<HashMap<String, Item>>,
    snapshot: RwLock<Arc<Snapshot>>,
    refreshing: AtomicBool,
}

impl NewsService {
    /// Builds the reader; nothing is fetched until the first request.
    #[must_use]
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("VedicPatroNews/0.1 (+https://vedicpatro.com)")
            .build()
            .unwrap_or_default();
        Self {
            inner: Arc::new(Inner {
                client,
                items: Mutex::new(HashMap::new()),
                snapshot: RwLock::new(Arc::new(Snapshot::default())),
                refreshing: AtomicBool::new(false),
            }),
        }
    }

    /// The current stories. The first call waits for the feeds; later calls get the
    /// stored copy at once and start a background read when it is stale.
    pub async fn snapshot(&self) -> Arc<Snapshot> {
        let current = Arc::clone(&*self.inner.snapshot.read().await);
        if current.fetched_at == 0 {
            self.refresh().await;
            return Arc::clone(&*self.inner.snapshot.read().await);
        }
        if is_stale(current.fetched_at) && !self.inner.refreshing.swap(true, Ordering::AcqRel) {
            let service = self.clone();
            tokio::spawn(async move {
                service.refresh().await;
                service.inner.refreshing.store(false, Ordering::Release);
            });
        }
        current
    }

    /// Reads every feed at once, merges new items into the store and regroups.
    /// A feed that fails keeps its earlier items. Callers queue on the item lock, and
    /// whoever finds the store already fresh returns at once.
    async fn refresh(&self) {
        let mut items = self.inner.items.lock().await;
        if !is_stale(self.inner.snapshot.read().await.fetched_at) {
            return;
        }
        let mut tasks = tokio::task::JoinSet::new();
        for feed in FEEDS {
            let client = self.inner.client.clone();
            tasks.spawn(async move { (feed, fetch(&client, feed.url).await) });
        }
        let now = now_unix();
        while let Some(joined) = tasks.join_next().await {
            let Ok((feed, body)) = joined else { continue };
            match body {
                Ok(body) => {
                    for item in parse_feed(&body, feed, now) {
                        items.entry(item.link.clone()).or_insert(item);
                    }
                }
                Err(error) => tracing::warn!(%error, feed = feed.name, "news feed read failed"),
            }
        }
        items.retain(|_, item| now - item.published < KEEP_SECS);
        if items.len() > MAX_ITEMS {
            let mut by_age: Vec<(i64, String)> = items
                .values()
                .map(|i| (i.published, i.link.clone()))
                .collect();
            by_age.sort_unstable();
            for (_, link) in by_age.into_iter().take(items.len() - MAX_ITEMS) {
                items.remove(&link);
            }
        }
        let stories = group(items.values().cloned().collect());
        drop(items);
        *self.inner.snapshot.write().await = Arc::new(Snapshot {
            stories,
            fetched_at: now,
        });
    }
}

impl Default for NewsService {
    fn default() -> Self {
        Self::new()
    }
}

fn now_unix() -> i64 {
    jiff::Timestamp::now().as_second()
}

fn is_stale(fetched_at: i64) -> bool {
    now_unix() - fetched_at >= i64::try_from(REFRESH_AFTER.as_secs()).unwrap_or(i64::MAX)
}

/// Noon Nepal time on the `/yyyy/mm/dd/` date in an article URL, for feeds without
/// `pubDate` (The Kathmandu Post).
fn date_from_link(link: &str) -> Option<i64> {
    static DATE: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
        regex::Regex::new(r"/(20\d\d)/(\d{1,2})/(\d{1,2})/").expect("valid regex")
    });
    let caps = DATE.captures(link)?;
    let text = format!(
        "{}-{:0>2}-{:0>2}T12:00:00+05:45",
        &caps[1], &caps[2], &caps[3]
    );
    text.parse::<jiff::Timestamp>()
        .ok()
        .map(jiff::Timestamp::as_second)
}

async fn fetch(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let send = || async { client.get(url).send().await };
    // The Nepali outlets drop a connection now and then (about one read in ten in
    // production): one more try two seconds later.
    let response = match send().await {
        Err(e) if e.is_connect() || e.is_timeout() || e.is_request() => {
            tokio::time::sleep(Duration::from_secs(2)).await;
            send().await
        }
        other => other,
    }
    .and_then(reqwest::Response::error_for_status)
    .map_err(|e| error_chain(&e))?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() > MAX_FEED_BYTES {
        return Err(format!("feed too large: {} bytes", bytes.len()));
    }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// The error with its causes ("error sending request: … connection reset"), not just
/// reqwest's top line.
fn error_chain(error: &dyn std::error::Error) -> String {
    let mut text = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        text.push_str(": ");
        text.push_str(&cause.to_string());
        source = cause.source();
    }
    text
}

/// The items of one RSS 2.0 document. Items without a title or an http(s) link are
/// dropped; an item without a date is dated `now` (first seen).
// shortcut: RSS 2.0 only, no Atom; every feed in FEEDS is RSS. Add Atom when a feed needs it.
fn parse_feed(body: &str, feed: &Feed, now: i64) -> Vec<Item> {
    let body = escape_stray_ampersands(body);
    let Ok(doc) = roxmltree::Document::parse(&body) else {
        tracing::warn!(feed = feed.name, "news feed is not valid XML");
        return Vec::new();
    };
    doc.descendants()
        .filter(|n| n.has_tag_name("item"))
        .filter_map(|node| {
            let mut title = String::new();
            let mut link = String::new();
            let mut description = String::new();
            let mut date = None;
            let mut categories = String::new();
            for child in node.children().filter(roxmltree::Node::is_element) {
                let text = || {
                    child
                        .descendants()
                        .filter_map(|d| if d.is_text() { d.text() } else { None })
                        .collect::<String>()
                };
                match (child.tag_name().namespace(), child.tag_name().name()) {
                    (None, "title") => title = clean_text(&text()),
                    (None, "link") => text().trim().clone_into(&mut link),
                    (None, "description") => description = text(),
                    (None, "pubDate") => date = parse_date(text().trim()),
                    (None, "category") => {
                        categories.push_str(&text().to_lowercase());
                        categories.push(' ');
                    }
                    _ => {}
                }
            }
            if title.is_empty() || !(link.starts_with("https://") || link.starts_with("http://")) {
                return None;
            }
            categories.push_str(&link.to_lowercase());
            let summary = summarize(&description, &title);
            let published = date
                .or_else(|| date_from_link(&link))
                .unwrap_or(now)
                .min(now);
            Some(Item {
                source: feed.name,
                language: feed.language,
                title,
                link,
                summary,
                category: categorize(&categories),
                published,
            })
        })
        .collect()
}

/// Some feeds write a raw `&` ("S&P") or HTML entities XML lacks (`&nbsp;`); both
/// break strict parsing. Such an `&` becomes `&amp;`, and [`clean_text`] decodes the
/// HTML entity afterwards.
fn escape_stray_ampersands(body: &str) -> std::borrow::Cow<'_, str> {
    static XML_ENTITY: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
        regex::Regex::new(r"^&(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);")
            .expect("valid regex")
    });
    if !body
        .match_indices('&')
        .any(|(at, _)| !XML_ENTITY.is_match(&body[at..]))
    {
        return std::borrow::Cow::Borrowed(body);
    }
    let mut out = String::with_capacity(body.len() + 64);
    let mut last = 0;
    for (at, _) in body.match_indices('&') {
        out.push_str(&body[last..at]);
        out.push_str(if XML_ENTITY.is_match(&body[at..]) {
            "&"
        } else {
            "&amp;"
        });
        last = at + 1;
    }
    out.push_str(&body[last..]);
    std::borrow::Cow::Owned(out)
}

fn parse_date(text: &str) -> Option<i64> {
    jiff::fmt::rfc2822::parse(text)
        .map(|z| z.timestamp().as_second())
        .ok()
        .or_else(|| {
            text.parse::<jiff::Timestamp>()
                .ok()
                .map(jiff::Timestamp::as_second)
        })
}

/// The feed description as plain text, cut short; `None` when empty or just the title.
fn summarize(description: &str, title: &str) -> Option<String> {
    let mut text = clean_text(description);
    // WordPress appends "The post <title> appeared first on <site>."
    if let Some(at) = text
        .find("The post ")
        .filter(|_| text.contains("appeared first on"))
    {
        text.truncate(at);
    }
    let text = text.trim_end_matches(['[', '…', ']', ' ', '.']).trim();
    if text.is_empty() || text == title {
        return None;
    }
    if text.chars().count() <= SUMMARY_CHARS {
        return Some(text.to_owned());
    }
    let cut: String = text.chars().take(SUMMARY_CHARS).collect();
    let cut = cut.rsplit_once(' ').map_or(cut.as_str(), |(head, _)| head);
    Some(format!("{}…", cut.trim_end()))
}

/// HTML from a feed as plain text: tags removed, entities decoded, spaces collapsed.
fn clean_text(html: &str) -> String {
    let mut plain = String::with_capacity(html.len());
    let mut in_tag = false;
    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' if in_tag => {
                in_tag = false;
                plain.push(' ');
            }
            _ if !in_tag => plain.push(c),
            _ => {}
        }
    }
    let decoded = decode_entities(&plain);
    decoded
        .split(|c: char| c.is_whitespace() || c == '\u{200e}' || c == '\u{feff}')
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn decode_entities(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(at) = rest.find('&') {
        out.push_str(&rest[..at]);
        rest = &rest[at..];
        let decoded = rest.find(';').filter(|&end| end <= 10).and_then(|end| {
            let name = &rest[1..end];
            let c = match name {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                "nbsp" => Some(' '),
                "lsquo" => Some('‘'),
                "rsquo" => Some('’'),
                "ldquo" => Some('“'),
                "rdquo" => Some('”'),
                "ndash" => Some('–'),
                "mdash" => Some('—'),
                "hellip" => Some('…'),
                _ => name.strip_prefix('#').and_then(|num| {
                    num.strip_prefix(['x', 'X'])
                        .map_or_else(|| num.parse().ok(), |hex| u32::from_str_radix(hex, 16).ok())
                        .and_then(char::from_u32)
                }),
            }?;
            Some((c, end))
        });
        if let Some((c, end)) = decoded {
            out.push(c);
            rest = &rest[end + 1..];
        } else {
            out.push('&');
            rest = &rest[1..];
        }
    }
    out.push_str(rest);
    out
}

/// A category from the feed's own category tags and the article URL.
fn categorize(haystack: &str) -> &'static str {
    const RULES: &[(&str, &[&str])] = &[
        (
            "sports",
            &["खेल", "sport", "cricket", "football", "क्रिकेट", "फुटबल"],
        ),
        (
            "entertainment",
            &["मनोरञ्जन", "entertainment", "film", "सिनेमा", "lifestyle"],
        ),
        (
            "technology",
            &["प्रविधि", "technology", "/tech", "विज्ञान", "science"],
        ),
        ("health", &["स्वास्थ्य", "health"]),
        (
            "economy",
            &[
                "अर्थ",
                "economy",
                "business",
                "/money",
                "market",
                "बजार",
                "/kinmel",
                "बैंक",
                "banking",
            ],
        ),
        (
            "world",
            &["अन्तर्राष्ट्रिय", "विश्व", "international", "/world", "/global"],
        ),
        ("politics", &["राजनीति", "politic"]),
    ];
    RULES
        .iter()
        .find(|(_, words)| words.iter().any(|w| haystack.contains(w)))
        .map_or("news", |(slug, _)| slug)
}

/// Headline words used to match stories: lowercase, common words and Nepali case
/// endings removed.
fn keywords(title: &str) -> HashSet<String> {
    const STOP: &[&str] = &[
        "र",
        "तथा",
        "पनि",
        "छ",
        "छन्",
        "गर्न",
        "गर्ने",
        "भएको",
        "हुने",
        "गरेको",
        "गरे",
        "नै",
        "यो",
        "त्यो",
        "the",
        "a",
        "an",
        "of",
        "in",
        "on",
        "to",
        "for",
        "and",
        "is",
        "at",
        "with",
        "as",
        "by",
        "from",
        "after",
        "over",
        "its",
        "be",
        "are",
        "was",
        "says",
        "said",
        "new",
    ];
    const ENDINGS: &[&str] = &[
        "हरूको",
        "हरूले",
        "हरूलाई",
        "हरू",
        "लाई",
        "बाट",
        "द्वारा",
        "सँग",
        "को",
        "का",
        "की",
        "ले",
        "मा",
    ];
    title
        .split(|c: char| c.is_whitespace() || c.is_ascii_punctuation() || "।॥‘’“”–—…".contains(c))
        .map(str::to_lowercase)
        .filter(|w| !STOP.contains(&w.as_str()))
        .map(|mut w| {
            let stem = ENDINGS
                .iter()
                .find_map(|e| w.strip_suffix(e).filter(|s| s.chars().count() >= 2))
                .map(str::len);
            if let Some(len) = stem {
                w.truncate(len);
            }
            w
        })
        .filter(|w| w.chars().count() >= 2 || (!w.is_empty() && w.chars().all(char::is_numeric)))
        .collect()
}

/// Whether two headlines name the same event: at least three shared words, covering
/// at least half of the shorter headline.
fn same_story(a: &HashSet<String>, b: &HashSet<String>) -> bool {
    let shared = a.intersection(b).count();
    shared >= 3 && shared * 2 >= a.len().min(b.len())
}

/// Groups items into stories, newest first. An item joins the first story in its
/// language, within [`GROUP_WINDOW_SECS`], from a different outlet, whose headlines match.
fn group(mut items: Vec<Item>) -> Vec<Story> {
    items.sort_by(|a, b| {
        a.published
            .cmp(&b.published)
            .then_with(|| a.link.cmp(&b.link))
    });
    let mut groups: Vec<Vec<(Item, HashSet<String>)>> = Vec::new();
    for item in items {
        let words = keywords(&item.title);
        let found = groups.iter_mut().find(|members| {
            let first = &members[0].0;
            first.language == item.language
                && item.published - first.published <= GROUP_WINDOW_SECS
                && members.iter().all(|(m, _)| m.source != item.source)
                && members.iter().any(|(_, w)| same_story(w, &words))
        });
        match found {
            Some(members) => members.push((item, words)),
            None => groups.push(vec![(item, words)]),
        }
    }
    let mut stories: Vec<Story> = groups
        .into_iter()
        .map(|members| {
            let first = &members[0].0;
            let category = members
                .iter()
                .map(|(m, _)| m.category)
                .find(|c| *c != "news")
                .unwrap_or("news");
            let digest = Sha256::digest(first.link.as_bytes());
            Story {
                id: digest[..6].iter().fold(String::new(), |mut id, b| {
                    use std::fmt::Write as _;
                    let _ = write!(id, "{b:02x}");
                    id
                }),
                title: first.title.clone(),
                summary: members.iter().find_map(|(m, _)| m.summary.clone()),
                language: first.language,
                category,
                published_at: first.published,
                updated_at: members.last().map_or(first.published, |(m, _)| m.published),
                sources: members
                    .iter()
                    .map(|(m, _)| SourceLink {
                        name: m.source,
                        url: m.link.clone(),
                        published_at: m.published,
                    })
                    .collect(),
            }
        })
        .collect();
    stories.sort_by(|a, b| {
        b.updated_at
            .cmp(&a.updated_at)
            .then_with(|| b.id.cmp(&a.id))
    });
    stories
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(source: &'static str, title: &str, published: i64) -> Item {
        Item {
            source,
            language: "ne",
            title: title.to_owned(),
            link: format!("https://{source}.example/{published}"),
            summary: None,
            category: "news",
            published,
        }
    }

    #[test]
    fn groups_the_same_event_from_different_outlets() {
        let stories = group(vec![
            item(
                "a",
                "हिमताल विस्फोटको जोखिम कम गर्न साढे ७ अर्बको ‘सञ्जीवनी’ परियोजना",
                100,
            ),
            item(
                "b",
                "हिमताल विस्फोटको जोखिम न्युनिकरण गर्न ५० मिलियन डलरको ‘सञ्जीवनी’ परियोजना",
                200,
            ),
            item("c", "कांग्रेसको केन्द्रीय समिति निर्वाचन आयोगमा अद्यावधिक", 300),
            item(
                "a",
                "हिमताल विस्फोटको जोखिम घटाउने ‘सञ्जीवनी’ परियोजना सुरु",
                400,
            ),
        ]);
        assert_eq!(stories.len(), 3, "{stories:#?}");
        let himtal = stories
            .iter()
            .find(|s| s.sources.len() == 2)
            .expect("grouped story");
        assert_eq!(himtal.sources[0].name, "a", "earliest outlet leads");
        assert_eq!(
            himtal.updated_at, 200,
            "same outlet twice stays a separate story"
        );
        assert_eq!(stories[0].updated_at, 400, "newest first");
    }

    #[test]
    fn cleans_feed_html() {
        assert_eq!(
            clean_text("<p>काठमाडौँ &#8211; नेपाली&nbsp;सेना &amp; <b>भारतीय</b></p>"),
            "काठमाडौँ – नेपाली सेना & भारतीय"
        );
        assert_eq!(clean_text("&lsquo;रेड बुल&rsquo;"), "‘रेड बुल’");
        assert_eq!(summarize("<![CDATA[]]>", "x"), None);
        assert_eq!(
            summarize("Body text. The post Title appeared first on Site.", "Title").as_deref(),
            Some("Body text")
        );
    }

    #[test]
    fn reads_rss_items() {
        let body = r#"<?xml version="1.0"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
            <item><title><![CDATA[ शीर्षक ]]></title><link> https://x.example/1 </link>
            <category><![CDATA[राजनीति]]></category><dc:creator>x</dc:creator>
            <description><![CDATA[<p>सार</p>]]></description>
            <pubDate> Wed, 25 Nov 2026 14:59:36 +0545 </pubDate></item>
            <item><title>No link</title></item>
            <item><title>Tesla aids S&P 500 &nbsp;entry</title><link>https://x.example/money/2026/11/25/t</link></item>
            </channel></rss>"#;
        let feed = Feed {
            name: "X",
            url: "",
            language: "ne",
        };
        let items = parse_feed(body, &feed, 2_000_000_000);
        assert_eq!(items.len(), 2, "item without a link is dropped");
        assert_eq!(
            items[1].title, "Tesla aids S&P 500 entry",
            "raw & and HTML entity survive"
        );
        assert_eq!(
            items[1].published, 1_795_587_300,
            "undated item takes the URL's date at noon NPT"
        );
        assert_eq!(items[0].title, "शीर्षक");
        assert_eq!(items[0].link, "https://x.example/1");
        assert_eq!(items[0].category, "politics");
        assert_eq!(items[0].summary.as_deref(), Some("सार"));
        assert_eq!(items[0].published, 1_795_598_076);
    }
}
