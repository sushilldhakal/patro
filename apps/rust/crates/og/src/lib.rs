//! The share card behind `/og-image`: the Panchanga page's 1200×630 link preview.
//!
//! Python screenshots the web app's chart in headless Chromium and, when that is
//! unavailable, draws this card with Pillow (`services/sharing/og_image.py`). The Rust
//! server has no browser, so it always draws the card: the same layout, colours and
//! strings, written as SVG and rasterized by resvg with the Mukta fonts the Python
//! server bundles (Devanagari shaping included; no system fonts are read).

#![expect(
    clippy::too_many_lines,
    clippy::cast_precision_loss,
    clippy::many_single_char_names,
    reason = "the card is one page of pixel coordinates, written the way the Pillow card is"
)]

use std::{fmt::Write as _, sync::Arc, sync::LazyLock};

use resvg::{
    tiny_skia::{Pixmap, Transform},
    usvg::{self, fontdb},
};

/// Width of the card (the size Facebook, X and `LinkedIn` recommend for `og:image`).
pub const WIDTH: u32 = 1200;
/// Height of the card.
pub const HEIGHT: u32 = 630;

static REGULAR: &[u8] = include_bytes!("../../../assets/fonts/Mukta-Regular.ttf");
static BOLD: &[u8] = include_bytes!("../../../assets/fonts/Mukta-Bold.ttf");
static EXTRA_BOLD: &[u8] = include_bytes!("../../../assets/fonts/Mukta-ExtraBold.ttf");

/// What the card shows (Python's `og_fields`).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Card {
    /// Weekday, Nepali.
    pub weekday: String,
    /// The Bikram Sambat date line.
    pub bs_line: String,
    /// The Gregorian date line, Nepali digits.
    pub ad_line: String,
    /// `शुक्ल पक्ष` or `कृष्ण पक्ष`.
    pub paksha: String,
    /// Tithi name, Nepali.
    pub tithi: String,
    /// Nakshatra name, Nepali.
    pub nakshatra: String,
    /// Yoga name, Nepali.
    pub yoga: String,
    /// Karana name, Nepali.
    pub karana: String,
    /// Sunrise (`HH:MM`).
    pub sunrise: String,
    /// Sunset (`HH:MM`).
    pub sunset: String,
    /// The place the card is for.
    pub location: String,
}

/// Why a card could not be drawn.
#[derive(Debug, thiserror::Error)]
pub enum CardError {
    /// The generated SVG did not parse (a bug in this crate).
    #[error("share card SVG: {0}")]
    Svg(String),
    /// The pixel buffer could not be allocated or encoded.
    #[error("share card PNG: {0}")]
    Png(String),
}

const CREAM: &str = "#f7f3ea";
const TEAL: &str = "#0b565a";
const GOLD: &str = "#d97706";
const GOLD_SOFT: &str = "#e6b94d";
const INK: &str = "#202a2c";
const MUTED: &str = "#6e7878";
const RULE: &str = "#e0d8c8";

static FONTS: LazyLock<Arc<fontdb::Database>> = LazyLock::new(|| {
    let mut db = fontdb::Database::new();
    for data in [REGULAR, BOLD, EXTRA_BOLD] {
        db.load_font_data(data.to_vec());
    }
    Arc::new(db)
});

/// The font's ascender, as a fraction of its em (`hhea`): Pillow places a line of text
/// with its *ascender* at the requested y, SVG places its *baseline* there.
fn ascent_ratio(font: &[u8]) -> f32 {
    let be16 = |at: usize| {
        font.get(at..at + 2)
            .map(|b| u16::from_be_bytes([b[0], b[1]]))
    };
    let tables = be16(4).map_or(0, usize::from);
    let find = |tag: &[u8; 4]| {
        (0..tables).find_map(|i| {
            let record = 12 + i * 16;
            (font.get(record..record + 4) == Some(tag))
                .then(|| {
                    font.get(record + 8..record + 12)
                        .map(|b| u32::from_be_bytes([b[0], b[1], b[2], b[3]]) as usize)
                })
                .flatten()
        })
    };
    let (Some(head), Some(hhea)) = (find(b"head"), find(b"hhea")) else {
        return 1.0;
    };
    let (Some(units), Some(ascender)) = (be16(head + 18), be16(hhea + 4)) else {
        return 1.0;
    };
    f32::from(i16::from_be_bytes(ascender.to_be_bytes())) / f32::from(units.max(1))
}

/// One line of text at `(x, y)` where `y` is the top of the line, as Pillow's
/// `draw.text` takes it.
struct Line<'a> {
    text: &'a str,
    x: f32,
    y: f32,
    size: f32,
    weight: u16,
    fill: &'a str,
    /// Right-aligned at `x`.
    end: bool,
}

fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            c => out.push(c),
        }
    }
    out
}

fn text(svg: &mut String, line: &Line<'_>) {
    let font = match line.weight {
        800 => EXTRA_BOLD,
        700 => BOLD,
        _ => REGULAR,
    };
    // Pillow (FreeType) rounds the ascent up to a whole pixel.
    let ascent = (ascent_ratio(font) * line.size).ceil();
    let baseline = line.y + ascent;
    let anchor = if line.end { "end" } else { "start" };
    let _ = writeln!(
        svg,
        r#"<text x="{}" y="{baseline}" font-family="Mukta" font-weight="{}" font-size="{}" fill="{}" text-anchor="{anchor}" xml:space="preserve">{}</text>"#,
        line.x,
        line.weight,
        line.size,
        line.fill,
        escape(line.text),
    );
}

fn rect(svg: &mut String, x: f32, y: f32, w: f32, h: f32, fill: &str) {
    let _ = writeln!(
        svg,
        r#"<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/>"#
    );
}

/// The small radiating sun beside the title (the site's favicon).
fn sun(svg: &mut String, cx: f32, cy: f32, r: f32, color: &str) {
    for i in 0..12u8 {
        let angle = std::f32::consts::TAU * f32::from(i) / 12.0;
        let (sin, cos) = angle.sin_cos();
        let _ = writeln!(
            svg,
            r#"<line x1="{}" y1="{}" x2="{}" y2="{}" stroke="{color}" stroke-width="4"/>"#,
            cx + cos * (r + 6.0),
            cy + sin * (r + 6.0),
            cx + cos * (r + 16.0),
            cy + sin * (r + 16.0),
        );
    }
    let _ = writeln!(
        svg,
        r#"<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}"/>"#
    );
}

/// The card as SVG, laid out as `render_panchanga_og` lays it out.
#[must_use]
pub fn svg(card: &Card) -> String {
    let (w, h) = (WIDTH as f32, HEIGHT as f32);
    let mut s = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
"#
    );
    rect(&mut s, 0.0, 0.0, w, h, CREAM);

    // Header band.
    let band = 132.0;
    rect(&mut s, 0.0, 0.0, w, band, TEAL);
    rect(&mut s, 0.0, band, w, 4.0, GOLD);
    sun(&mut s, 74.0, band / 2.0, 26.0, GOLD_SOFT);
    for line in [
        Line {
            text: "वैदिक पात्रो",
            x: 122.0,
            y: 30.0,
            size: 46.0,
            weight: 800,
            fill: "#ffffff",
            end: false,
        },
        Line {
            text: "VEDIC PATRO · PANCHANGA",
            x: 124.0,
            y: 86.0,
            size: 20.0,
            weight: 700,
            fill: GOLD_SOFT,
            end: false,
        },
        Line {
            text: "vedicpatro.com",
            x: w - 40.0,
            y: 54.0,
            size: 24.0,
            weight: 700,
            fill: GOLD_SOFT,
            end: true,
        },
    ] {
        text(&mut s, &line);
    }

    // Location and date.
    let y = band + 42.0;
    let place = if card.location.is_empty() {
        "Nepal"
    } else {
        &card.location
    };
    text(
        &mut s,
        &Line {
            text: place,
            x: 60.0,
            y,
            size: 34.0,
            weight: 700,
            fill: TEAL,
            end: false,
        },
    );
    let date_line = [
        card.weekday.as_str(),
        if card.bs_line.is_empty() {
            &card.ad_line
        } else {
            &card.bs_line
        },
    ]
    .iter()
    .filter(|part| !part.is_empty())
    .copied()
    .collect::<Vec<_>>()
    .join(" · ");
    text(
        &mut s,
        &Line {
            text: &date_line,
            x: w - 60.0,
            y: y + 4.0,
            size: 30.0,
            weight: 700,
            fill: INK,
            end: true,
        },
    );
    if !card.bs_line.is_empty() {
        text(
            &mut s,
            &Line {
                text: &card.ad_line,
                x: 60.0,
                y: y + 46.0,
                size: 26.0,
                weight: 400,
                fill: MUTED,
                end: false,
            },
        );
    }

    // The tithi.
    let ty = y + 108.0;
    text(
        &mut s,
        &Line {
            text: &card.paksha,
            x: 60.0,
            y: ty,
            size: 30.0,
            weight: 700,
            fill: GOLD,
            end: false,
        },
    );
    text(
        &mut s,
        &Line {
            text: &card.tithi,
            x: 58.0,
            y: ty + 40.0,
            size: 96.0,
            weight: 800,
            fill: TEAL,
            end: false,
        },
    );

    // Nakshatra, yoga, karana.
    let col_y = ty + 168.0;
    let col_w = (w - 120.0).div_euclid(3.0);
    for (i, (label, value)) in [
        ("नक्षत्र", &card.nakshatra),
        ("योग", &card.yoga),
        ("करण", &card.karana),
    ]
    .into_iter()
    .enumerate()
    {
        let x = 60.0 + i as f32 * col_w;
        text(
            &mut s,
            &Line {
                text: label,
                x,
                y: col_y,
                size: 24.0,
                weight: 700,
                fill: MUTED,
                end: false,
            },
        );
        text(
            &mut s,
            &Line {
                text: value,
                x,
                y: col_y + 30.0,
                size: 44.0,
                weight: 800,
                fill: INK,
                end: false,
            },
        );
    }

    // Sunrise and sunset.
    let sy = col_y + 108.0;
    let _ = writeln!(
        s,
        r#"<line x1="60" y1="{}" x2="{}" y2="{}" stroke="{RULE}" stroke-width="2"/>"#,
        sy - 14.0,
        w - 60.0,
        sy - 14.0
    );
    let sunrise = format!("सूर्योदय  {}", ne_digits(&card.sunrise));
    let sunset = format!("सूर्यास्त  {}", ne_digits(&card.sunset));
    text(
        &mut s,
        &Line {
            text: &sunrise,
            x: 60.0,
            y: sy,
            size: 30.0,
            weight: 700,
            fill: TEAL,
            end: false,
        },
    );
    // The sunset starts after the sunrise text (at least 260 px wide) and 80 px more.
    let sunset_x = 60.0 + text_width(&sunrise, 30.0, 700).max(260.0) + 80.0;
    text(
        &mut s,
        &Line {
            text: &sunset,
            x: sunset_x,
            y: sy,
            size: 30.0,
            weight: 700,
            fill: TEAL,
            end: false,
        },
    );
    text(
        &mut s,
        &Line {
            text: "Nepali Calendar · Surya Panchanga",
            x: w - 60.0,
            y: sy + 4.0,
            size: 24.0,
            weight: 700,
            fill: MUTED,
            end: true,
        },
    );
    s.push_str("</svg>\n");
    s
}

fn options() -> usvg::Options<'static> {
    usvg::Options {
        fontdb: Arc::clone(&FONTS),
        font_family: "Mukta".to_owned(),
        ..usvg::Options::default()
    }
}

/// The width of a line of Mukta text, shaped the way the card draws it.
fn text_width(content: &str, size: f32, weight: u16) -> f32 {
    let mut probe =
        String::from(r#"<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="200">"#);
    let _ = write!(
        probe,
        r#"<text x="0" y="100" font-family="Mukta" font-weight="{weight}" font-size="{size}">{}</text></svg>"#,
        escape(content)
    );
    usvg::Tree::from_str(&probe, &options())
        .ok()
        .and_then(|tree| tree.root().abs_bounding_box())
        .map_or(0.0, |bounds| bounds.width())
}

/// ASCII digits to Devanagari, other characters unchanged.
fn ne_digits(text: &str) -> String {
    text.chars()
        .map(|c| match c.to_digit(10) {
            Some(d) => char::from_u32(0x0966 + d).unwrap_or(c),
            None => c,
        })
        .collect()
}

/// Draws the card and returns PNG bytes.
///
/// # Errors
///
/// [`CardError`] if the SVG cannot be parsed or the PNG cannot be encoded.
pub fn render_png(card: &Card) -> Result<Vec<u8>, CardError> {
    let tree =
        usvg::Tree::from_str(&svg(card), &options()).map_err(|e| CardError::Svg(e.to_string()))?;
    let mut pixmap =
        Pixmap::new(WIDTH, HEIGHT).ok_or_else(|| CardError::Png("empty pixmap".into()))?;
    resvg::render(&tree, Transform::identity(), &mut pixmap.as_mut());
    pixmap
        .encode_png()
        .map_err(|e| CardError::Png(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn card() -> Card {
        Card {
            weekday: "शनिवार".into(),
            bs_line: "मंसिर ५, २०८३".into(),
            ad_line: "२१ नोभेम्बर २०२६".into(),
            paksha: "शुक्ल पक्ष".into(),
            tithi: "द्वादशी".into(),
            nakshatra: "पूर्वाफाल्गुनी".into(),
            yoga: "शुक्ल".into(),
            karana: "बालव".into(),
            sunrise: "06:32".into(),
            sunset: "17:04".into(),
            location: "Kathmandu".into(),
        }
    }

    #[test]
    fn the_fonts_load_as_one_family() {
        let db = &*FONTS;
        let mut weights: Vec<(String, u16)> = db
            .faces()
            .map(|f| (f.families[0].0.clone(), f.weight.0))
            .collect();
        weights.sort();
        assert_eq!(
            weights,
            [
                ("Mukta".to_owned(), 400),
                ("Mukta".to_owned(), 700),
                ("Mukta".to_owned(), 800)
            ],
            "{weights:?}"
        );
    }

    #[test]
    fn the_card_is_a_1200_by_630_png() {
        let png = render_png(&card()).expect("png");
        assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n", "signature");
        let be = |at: usize| u32::from_be_bytes([png[at], png[at + 1], png[at + 2], png[at + 3]]);
        assert_eq!((be(16), be(20)), (WIDTH, HEIGHT), "IHDR size");
        assert!(png.len() > 10_000, "text was drawn: {} bytes", png.len());
    }

    #[test]
    fn text_is_escaped() {
        let mut c = card();
        c.location = "A & <B>".into();
        assert!(svg(&c).contains("A &amp; &lt;B&gt;"));
        assert!(render_png(&c).is_ok());
    }

    #[test]
    fn ascent_comes_from_the_font() {
        let ratio = ascent_ratio(BOLD);
        assert!((0.5..2.0).contains(&ratio), "{ratio}");
    }
}
