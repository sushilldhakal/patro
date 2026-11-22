//! Personal rashifal (`engine/jyotish/rashifal_personal.py`): every layer counted from
//! the birth Lagna, transit bindus read from the natal Ashtakavarga, and the running
//! Vimshottari Mahadasha / Antardasha as a layer of its own.

use panchanga::{
    RASHI_NAMES, RASHI_NAMES_NE, graha_positions, nepali_digits,
    pyfloat::{py_mod, py_round},
};
use serde_json::{Map, Value, json};
use timescale::{UtcInstant, Zone};

use super::{
    Period, Tone,
    frame::DayFrame,
    layers::{
        AvBlock, Chandrabala, Cycle, Domain, GocharRow, Moorti, RashiLord, VaaraHora,
        ashtakavarga_block, chandrabala_block, clamp, cycle_block, dignity, domain_scores,
        gochar_rows, gochar_score, house_from, moorti_block, percent, rashi_lord_block,
        vaara_hora_block,
    },
    payload::{lord_json, rows_json},
    personal_tables::{
        CHAKRA_EN, CHAKRA_GLOSS_EN, CHAKRA_GLOSS_NE, CHAKRA_NE, NATAL_CHAKRA_WEIGHTS,
        PERSONAL_LAYER_KEYS, PERSONAL_LAYER_LABEL_EN, PERSONAL_LAYER_LABEL_NE,
        PERSONAL_LAYER_WEIGHTS, PERSONAL_TONE_CLOSER_EN, PERSONAL_TONE_CLOSER_NE,
        PERSONAL_TONE_OPENER_EN, PERSONAL_TONE_OPENER_NE,
    },
    tables::{
        DIGNITY_EN, DIGNITY_NE, DOMAIN_EN, DOMAIN_HOUSES, DOMAIN_KARAKA, DOMAIN_KEYS, DOMAIN_NE,
        HOUSE_STANDING, HOUSE_THEME_EN, HOUSE_THEME_NE, LORD_COLOR_EN, LORD_COLOR_NE,
        LORD_DISHA_EN, LORD_DISHA_NE, LORD_NUMBER, MOORTI_EN, MOORTI_NE, PERIOD_EN, PERIOD_NE,
        REMEDY_EN, REMEDY_NE,
    },
    text::{Lang, culprit},
};
use crate::{
    Graha,
    ashtakavarga::{Ashtakavarga, sign_of},
    dasha::{self, DashaPeriod, YEAR_DAYS, running, sub_periods, vimshottari_timeline},
    graha::SIGN_LORD,
};

/// `AGGREGATE_PEAK_WEIGHT`.
const AGGREGATE_PEAK_WEIGHT: f64 = 0.35;

/// `NatalChart`: the birth Lagna, the nine grahas' signs and degrees, the natal
/// Ashtakavarga, and the birth moment the dasha runs from.
#[derive(Debug, Clone)]
pub struct NatalChart {
    /// Birth moment on its zone's wall clock.
    wall: UtcInstant,
    zone: Zone,
    lagna_sign: usize,
    /// By [`Graha::index`].
    sign: [usize; 9],
    /// `round(deg_in_sign, 6)`, by [`Graha::index`].
    degree: [f64; 9],
    sav: [u32; 12],
    bav: [[u32; 12]; 7],
    /// The natal Moon's nakshatra, 0-based (`chart.moon_nak[0]`).
    moon_nak: usize,
}

impl NatalChart {
    /// `build_natal_chart(birth_instant, lat=, lon=)`: `utc` is the birth moment,
    /// `wall` its wall clock in `zone` (the `tzinfo` Python's `datetime` carries,
    /// which the dasha boundaries are reckoned and printed in).
    #[must_use]
    pub fn cast(
        system: astronomy::System,
        utc: UtcInstant,
        wall: UtcInstant,
        zone: &Zone,
        lat: f64,
        lon: f64,
    ) -> Self {
        let jd = utc.to_jd();
        let mut sign = [0usize; 9];
        let mut degree = [0.0; 9];
        let mut moon_nak = 0;
        for row in graha_positions(system, jd) {
            if row.key == "moon" {
                #[expect(
                    clippy::cast_possible_truncation,
                    clippy::cast_sign_loss,
                    reason = "a longitude in [0, 360) over a 13.3° span"
                )]
                let nak = (row.longitude / (360.0 / 27.0)) as usize % 27;
                moon_nak = nak;
            }
            if let Some(g) = Graha::from_key(row.key) {
                sign[g.index()] = sign_of(row.longitude);
                degree[g.index()] = py_round(py_mod(py_mod(row.longitude, 360.0), 30.0), 6);
            }
        }
        let lagna_lon = py_round(system.ascendant(jd, lat, lon), 6);
        let lagna_sign = sign_of(lagna_lon);
        let mut seven = [0usize; 7];
        for (i, g) in Graha::SEVEN.iter().enumerate() {
            seven[i] = sign[g.index()];
        }
        let av = Ashtakavarga::cast(seven, lagna_sign);
        Self {
            wall,
            zone: zone.clone(),
            lagna_sign,
            sign,
            degree,
            sav: av.sarva(),
            bav: av.bav,
            moon_nak,
        }
    }

    /// The natal Moon's sign, 0-based (`natal.moon_sign`).
    #[must_use]
    pub fn moon_sign_index(&self) -> usize {
        self.moon_sign()
    }

    /// The natal Moon's nakshatra, 0-based.
    #[must_use]
    pub const fn moon_nakshatra_index(&self) -> usize {
        self.moon_nak
    }

    /// The running Mahadasha and Antardasha lords at `as_of` (UTC).
    #[must_use]
    pub fn dasha_lords(&self, as_of: UtcInstant) -> (Graha, Graha) {
        let d = dasha_block(self, self.wall_of(as_of));
        (d.maha.lord, d.antar.lord)
    }

    fn moon_sign(&self) -> usize {
        self.sign[Graha::Moon.index()]
    }

    fn sun_sign(&self) -> usize {
        self.sign[Graha::Sun.index()]
    }

    /// `_sign_lon`.
    fn sign_lon(&self, graha: Graha) -> f64 {
        #[expect(clippy::cast_precision_loss, reason = "a sign index")]
        let base = self.sign[graha.index()] as f64 * 30.0;
        base + self.degree[graha.index()]
    }

    /// The wall clock of `as_of` (UTC) in the birth zone.
    fn wall_of(&self, as_of: UtcInstant) -> UtcInstant {
        as_of.add_seconds(i64::from(self.zone.offset_seconds_at(as_of)))
    }
}

/// `dasha_block`: the running Mahadasha and Antardasha, scored from the birth chart.
#[derive(Debug, Clone, PartialEq)]
struct DashaBlock {
    score: f64,
    maha: DashaPeriod,
    antar: DashaPeriod,
}

/// `_dasha_score_for_lord`.
fn dasha_score_for_lord(natal: &NatalChart, lord: Graha) -> f64 {
    let house = house_from(natal.sign[lord.index()], natal.lagna_sign);
    let placement = HOUSE_STANDING[house];
    if matches!(lord, Graha::Rahu | Graha::Ketu) {
        return placement;
    }
    let (_, dignity_score) = dignity(lord, natal.sign[lord.index()], natal.degree[lord.index()]);
    clamp(0.6 * dignity_score + 0.4 * placement)
}

fn dasha_block(natal: &NatalChart, as_of_wall: UtcInstant) -> DashaBlock {
    let elapsed_years = (as_of_wall.seconds_since(natal.wall) / (YEAR_DAYS * 86400.0)).max(0.0);
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a handful of 120-year cycles"
    )]
    let cycles = (((elapsed_years + 5.0) / 120.0).ceil() as usize).max(1);
    let timeline = vimshottari_timeline(natal.sign_lon(Graha::Moon), natal.wall, cycles);
    let last = timeline.periods[timeline.periods.len() - 1];
    let maha = *running(&timeline.periods, as_of_wall).unwrap_or(&last);
    let antardashas = sub_periods(
        maha.lord,
        maha.start,
        maha.end,
        Some(f64::from(dasha::years(maha.lord))),
    );
    let antar = running(&antardashas, as_of_wall)
        .or_else(|| antardashas.last())
        .copied()
        .unwrap_or(maha);
    let score = clamp(
        0.6 * dasha_score_for_lord(natal, maha.lord)
            + 0.4 * dasha_score_for_lord(natal, antar.lord),
    );
    DashaBlock {
        score: py_round(score, 4),
        maha,
        antar,
    }
}

fn period_json(p: &DashaPeriod, zone: &Zone) -> Value {
    json!({
        "lord": p.lord.key(), "lord_ne": dasha::lord_ne(p.lord), "lord_en": p.lord.en(),
        "start": dasha::iso(p.start, zone), "end": dasha::iso(p.end, zone),
    })
}

fn dasha_json(d: &DashaBlock, zone: &Zone) -> Value {
    json!({
        "score": d.score,
        "mahadasha": period_json(&d.maha, zone),
        "antardasha": period_json(&d.antar, zone),
    })
}

/// `score_personal`.
#[derive(Debug, Clone, PartialEq)]
struct PersonalScored {
    score: f64,
    raw: f64,
    gochar: f64,
    /// lagna, moon, sun.
    chakra: [f64; 3],
    rows: Vec<GocharRow>,
    chandrabala: Chandrabala,
    moorti: Moorti,
    ashtakavarga: AvBlock,
    rashi_lord: RashiLord,
    cycle: Cycle,
    vaara: VaaraHora,
    dasha: DashaBlock,
    domains: Vec<Domain>,
}

impl PersonalScored {
    /// Block scores in the personal `LAYER_KEYS` order.
    fn layer_scores(&self) -> [f64; 8] {
        [
            self.gochar,
            self.chandrabala.score,
            self.moorti.score,
            self.ashtakavarga.score,
            self.rashi_lord.score,
            self.dasha.score,
            self.cycle.score,
            self.vaara.score,
        ]
    }
}

/// The day frame with the natal Ashtakavarga in place of the transit chart's.
fn personal_frame(frame: &DayFrame, natal: &NatalChart) -> DayFrame {
    frame.with_ashtakavarga(natal.sav, &natal.bav)
}

fn score_personal(
    natal: &NatalChart,
    frame: &DayFrame,
    period: Period,
    dasha: &DashaBlock,
) -> PersonalScored {
    let pf = personal_frame(frame, natal);
    let refs = [natal.lagna_sign, natal.moon_sign(), natal.sun_sign()];
    let by_chakra: Vec<Vec<GocharRow>> = refs
        .iter()
        .map(|&sign| gochar_rows(&pf, sign, period))
        .collect();
    let mut chakra = [0.0; 3];
    for (i, rows) in by_chakra.iter().enumerate() {
        chakra[i] = gochar_score(rows);
    }
    let gochar = clamp(
        chakra
            .iter()
            .zip(NATAL_CHAKRA_WEIGHTS)
            .fold(0.0, |acc, (s, w)| acc + s * w),
    );
    let rows = by_chakra.into_iter().next().unwrap_or_default();
    let mut scored = PersonalScored {
        score: 0.0,
        raw: 0.0,
        gochar,
        chakra,
        chandrabala: chandrabala_block(frame, natal.moon_sign()),
        moorti: moorti_block(frame, natal.moon_sign()),
        ashtakavarga: ashtakavarga_block(&pf, natal.lagna_sign),
        rashi_lord: rashi_lord_block(frame, natal.lagna_sign),
        cycle: cycle_block(frame, natal.lagna_sign, period),
        vaara: vaara_hora_block(frame, natal.lagna_sign),
        dasha: dasha.clone(),
        domains: domain_scores(&pf, natal.lagna_sign, &rows),
        rows,
    };
    let weights = &PERSONAL_LAYER_WEIGHTS[period.index()];
    let raw = scored
        .layer_scores()
        .iter()
        .zip(weights)
        .fold(0.0, |acc, (s, w)| acc + s * w);
    scored.raw = clamp(raw);
    scored.score = py_round(scored.raw, 4);
    scored
}

/// `_num`.
fn num(value: usize, lang: Lang) -> String {
    if lang == Lang::Ne {
        nepali_digits(value)
    } else {
        value.to_string()
    }
}

/// `_join`.
fn join(names: &[&str], lang: Lang) -> String {
    if lang == Lang::Ne || names.len() < 2 {
        return names.join(", ");
    }
    format!(
        "{} and {}",
        names[..names.len() - 1].join(", "),
        names[names.len() - 1]
    )
}

/// `_sav_note` of the personal reading.
fn sav_note(sav: u32, lang: Lang) -> String {
    let ne = lang == Lang::Ne;
    let count = if ne {
        nepali_digits(sav)
    } else {
        sav.to_string()
    };
    if sav >= 30 {
        return if ne {
            format!(
                "जन्म अष्टकवर्गमा तपाईंको लग्न राशिमा {count} बिन्दु छन् — यो औसतभन्दा बलियो हो, त्यसैले प्रतिकूल गोचरले पनि दीर्घकालीन असर पार्दैन।"
            )
        } else {
            format!(
                "Your natal Ashtakavarga gives the Lagna sign {count} bindus — above average, so even an adverse transit does not leave a lasting mark."
            )
        };
    }
    if sav <= 25 {
        return if ne {
            format!(
                "जन्म अष्टकवर्गमा लग्न राशिमा {count} बिन्दु मात्र छन् — आधार अलि पातलो भएकाले अनुकूल गोचरको फल पनि पूरै नआउन सक्छ; काम गर्दा बलियो तयारी चाहिन्छ।"
            )
        } else {
            format!(
                "The Lagna sign holds only {count} bindus in your natal Ashtakavarga — a thin base, so even a favourable transit may not deliver in full; prepare more thoroughly than the transit suggests."
            )
        };
    }
    if ne {
        format!(
            "जन्म अष्टकवर्गमा लग्न राशिमा {count} बिन्दु छन् — औसत स्तरको आधार, जसले गोचरको फल जस्ताको तस्तै देखाउँछ।"
        )
    } else {
        format!(
            "The Lagna sign holds {count} bindus in your natal Ashtakavarga — an average base, which lets the transits read much as they stand."
        )
    }
}

/// `min(domain["houses"])`.
fn min_house(domain: usize) -> usize {
    DOMAIN_HOUSES[domain]
        .iter()
        .map(|&(h, _)| h)
        .min()
        .unwrap_or(1)
}

/// What the sentence for a favourable loudest transit says.
struct Support<'a> {
    ne: bool,
    graha: &'a str,
    sign: &'a str,
    house_text: &'a str,
    house: usize,
    /// The natal Ashtakavarga bindus of the sign, as printed. Rahu and Ketu have no
    /// Ashtakavarga row, so they have none (Python printed "None bindus").
    bindu: Option<String>,
    theme: &'a str,
}

/// The sentence for a favourable loudest transit; without a bindu count it says only
/// the support.
fn favourable_sentence(s: &Support<'_>) -> String {
    let Support {
        ne,
        graha,
        sign,
        house_text,
        house,
        theme,
        ..
    } = *s;
    match (ne, s.bindu.as_deref()) {
        (true, Some(bindu)) => format!(
            "गोचरमा {graha} {sign} राशिबाट {house_text} भावमा छन्, जहाँ तपाईंको जन्म अष्टकवर्गमा {bindu} बिन्दु छन् — {theme}मा यसले प्रत्यक्ष साथ दिन्छ।"
        ),
        (false, Some(bindu)) => format!(
            "{graha} transits {sign} into house {house}, where your natal Ashtakavarga holds {bindu} bindus — direct support for {theme}."
        ),
        (true, None) => format!(
            "गोचरमा {graha} {sign} राशिबाट {house_text} भावमा छन् — {theme}मा यसले प्रत्यक्ष साथ दिन्छ।"
        ),
        (false, None) => {
            format!("{graha} transits {sign} into house {house} — direct support for {theme}.")
        }
    }
}

/// The personal `_compose_prediction`. `domains` are (index, rounded score).
#[expect(
    clippy::too_many_lines,
    reason = "one sentence per layer, as in Python"
)]
fn compose(
    natal: &NatalChart,
    tone: Tone,
    period: Period,
    s: &PersonalScored,
    domains: &[(usize, f64)],
    lang: Lang,
) -> String {
    let ne = lang == Lang::Ne;
    let pi = period.index();
    let ti = tone.rank();
    let period_word = if ne { PERIOD_NE[pi] } else { PERIOD_EN[pi] };
    let opener = if ne {
        PERSONAL_TONE_OPENER_NE[ti]
    } else {
        PERSONAL_TONE_OPENER_EN[ti]
    };
    let theme = |h: usize| {
        if ne {
            HOUSE_THEME_NE[h]
        } else {
            HOUSE_THEME_EN[h]
        }
    };
    let mut parts = vec![opener.replace("{period}", period_word)];

    let (maha, antar) = (s.dasha.maha.lord, s.dasha.antar.lord);
    let lord_name = |g: Graha| if ne { dasha::lord_ne(g) } else { g.en() };
    let (maha_lord, antar_lord) = (lord_name(maha), lord_name(antar));
    let maha_house = house_from(natal.sign[maha.index()], natal.lagna_sign);
    let antar_house = house_from(natal.sign[antar.index()], natal.lagna_sign);
    parts.push(if ne {
        format!("हाल तपाईंको {maha_lord} महादशाभित्र {antar_lord} अन्तर्दशा चलिरहेको छ।")
    } else {
        format!("You are currently running {maha_lord} Mahadasha with {antar_lord} Antardasha.")
    });
    parts.push(if ne {
        format!(
            "महादशेश {maha_lord} जन्मकुण्डलीको {} भावमा रहेकाले यस अवधिको मूल विषय {}सँग जोडिएको छ, भने अन्तर्दशेश {antar_lord} {} भावमा भएकाले {}सँग जोडिएका प्रसङ्ग अहिले अगाडि आउँछन्।",
            num(maha_house, lang),
            theme(maha_house),
            num(antar_house, lang),
            theme(antar_house)
        )
    } else {
        format!(
            "The Mahadasha lord {maha_lord} sits in house {maha_house} of your birth chart, so the period's underlying subject is {}; the Antardasha lord {antar_lord} in house {antar_house} brings {} to the front right now.",
            theme(maha_house),
            theme(antar_house)
        )
    });

    // sorted(chakra.items(), key=value, reverse=True): stable.
    let mut ordered: Vec<(usize, f64)> = s.chakra.iter().copied().enumerate().collect();
    ordered.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let (best, worst) = (ordered[0], ordered[ordered.len() - 1]);
    if best.1 - worst.1 > 0.12 {
        parts.push(if ne {
            format!(
                "सुदर्शन चक्रमा {} चक्र बलियो देखिन्छ — {}ले साथ दिन्छ; {} चक्र भने कमजोर भएकाले {}मा चाप पर्न सक्छ।",
                CHAKRA_NE[best.0], CHAKRA_GLOSS_NE[best.0], CHAKRA_NE[worst.0], CHAKRA_GLOSS_NE[worst.0]
            )
        } else {
            format!(
                "Across the Sudarshana chakras the {} frame is the strong one — support comes through {}; the {} frame is weaker, so {} can come under pressure.",
                CHAKRA_EN[best.0], CHAKRA_GLOSS_EN[best.0], CHAKRA_EN[worst.0], CHAKRA_GLOSS_EN[worst.0]
            )
        });
    }

    let mut ranked = domains.to_vec();
    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let (strong, weak) = (ranked[0], ranked[ranked.len() - 1]);
    if strong.1 > 0.08 {
        let house = min_house(strong.0);
        parts.push(if ne {
            format!(
                "{} पक्ष सबैभन्दा बलियो छ — {}मा लगानी गरेको समय र मिहिनेतले प्रतिफल दिन्छ।",
                DOMAIN_NE[strong.0],
                theme(house)
            )
        } else {
            format!(
                "{} is the strongest side — time and effort put into {} return a real result.",
                DOMAIN_EN[strong.0],
                theme(house)
            )
        });
    }
    if weak.1 < -0.08 {
        let house = min_house(weak.0);
        parts.push(if ne {
            format!(
                "{} पक्षमा भने सतर्कता चाहिन्छ; {}सँग सम्बन्धित काममा हतार नगर्नुहोस्।",
                DOMAIN_NE[weak.0],
                theme(house)
            )
        } else {
            format!(
                "{} calls for care, though — do not rush anything touching {}.",
                DOMAIN_EN[weak.0],
                theme(house)
            )
        });
    }

    let rows = &s.rows;
    let mut loud = &rows[0];
    for r in &rows[1..] {
        if r.score.abs() * r.weight > loud.score.abs() * loud.weight {
            loud = r;
        }
    }
    let graha_name = if ne { loud.graha.ne() } else { loud.graha.en() };
    let sign_name = if ne {
        RASHI_NAMES_NE[loud.sign]
    } else {
        RASHI_NAMES[loud.sign]
    };
    let loud_house = num(loud.house, lang);
    let house = loud.house;
    if let Some(blocker) = loud.vedha_by {
        let blocker = if ne { blocker.ne() } else { blocker.en() };
        parts.push(if ne {
            format!("गोचरमा {graha_name} {sign_name} राशि हुँदै {loud_house} भावमा छन् तर {blocker}को वेध परेकाले त्यसको फल रोकिन्छ — आशा गरेको नतिजा ढिलो आउँछ।")
        } else {
            format!("In transit {graha_name} moves through {sign_name} into house {house}, but {blocker} obstructs it, so the promised result stalls and arrives late.")
        });
    } else if loud.favourable {
        let bindu = loud
            .bindu
            .map(|b| if ne { nepali_digits(b) } else { b.to_string() });
        parts.push(favourable_sentence(&Support {
            ne,
            graha: graha_name,
            sign: sign_name,
            house_text: &loud_house,
            house,
            bindu,
            theme: theme(house),
        }));
    } else {
        parts.push(if ne {
            format!(
                "गोचरमा {graha_name} {sign_name} राशिबाट {loud_house} भावमा रहेकाले {}मा दबाब पर्न सक्छ; यसै क्षेत्रमा बढी सचेत रहनुहोस्।",
                theme(house)
            )
        } else {
            format!(
                "{graha_name} transiting {sign_name} into house {house} can press on {} — that is the area to stay alert in.",
                theme(house)
            )
        });
    }

    let name = |r: &GocharRow| if ne { r.graha.ne() } else { r.graha.en() };
    let vakri: Vec<&str> = rows.iter().filter(|r| r.retrograde).map(name).collect();
    let asta: Vec<&str> = rows.iter().filter(|r| r.combust).map(name).collect();
    if !vakri.is_empty() {
        let names = join(&vakri, lang);
        let verb = if vakri.len() == 1 { "stands" } else { "stand" };
        parts.push(if ne {
            format!("{names} वक्री अवस्थामा रहेकाले अघि सुरु गरेर अलपत्र परेका काम फेरि जागृत हुन्छन् — नयाँ सुरु गर्नुभन्दा अधुरो काम टुङ्ग्याउन यो समय राम्रो हो।")
        } else {
            format!("{names} {verb} retrograde, so unfinished business started earlier resurfaces — a better window for closing what is open than for starting something new.")
        });
    }
    if !asta.is_empty() {
        let names = join(&asta, lang);
        let (verb, pronoun) = if asta.len() == 1 {
            ("is", "it")
        } else {
            ("are", "they")
        };
        parts.push(if ne {
            format!("{names} अस्त भएकाले त्यससँग जोडिएको विषयमा अहिले निर्णय गर्न हतार नगर्नुहोस्।")
        } else {
            format!(
                "{names} {verb} combust, so hold off on decisions tied to what {pronoun} signifies."
            )
        });
    }

    parts.push(sav_note(s.ashtakavarga.sav, lang));

    if matches!(period, Period::Daily | Period::Weekly) {
        let (tara, quality, tara_en, quality_en) = s.chandrabala.labels();
        let moorti = &s.moorti;
        parts.push(if ne {
            format!(
                "चन्द्रबल {tara} ({quality}) र गोचर चन्द्र जन्म राशिबाट {} भावमा — मूर्ति {}।",
                num(moorti.house_from_moon, lang),
                MOORTI_NE[moorti.kind]
            )
        } else {
            format!(
                "Chandrabala is {tara_en} ({}), with the transit Moon {} houses from your natal Moon — a {} moorti.",
                quality_en.to_lowercase(),
                moorti.house_from_moon,
                MOORTI_EN[moorti.kind]
            )
        });
    } else {
        let cycle = &s.cycle;
        parts.push(if ne {
            format!(
                "{period_word}को कालचक्रमा {} {} राशि हुँदै {} भावमा छन्, जसले सिङ्गो अवधिको गति निर्धारण गर्छ।",
                cycle.graha.ne(),
                RASHI_NAMES_NE[cycle.sign],
                num(cycle.house, lang)
            )
        } else {
            format!(
                "For {} the time-lord {} runs through {} in house {}, which sets the pace of the whole window.",
                period_word.to_lowercase(),
                cycle.graha.en(),
                RASHI_NAMES[cycle.sign],
                cycle.house
            )
        });
    }

    let lagna_lord = &s.rashi_lord;
    parts.push(if ne {
        format!(
            "लग्नेश {} {} भावमा {} अवस्थामा छन्, त्यसैले {}सँग जोडिएको प्रयासले नै समग्र फल निर्धारण गर्छ।",
            lagna_lord.lord.ne(),
            num(lagna_lord.house, lang),
            DIGNITY_NE[lagna_lord.dignity],
            theme(lagna_lord.house)
        )
    } else {
        format!(
            "Your Lagna lord {} stands in house {}, {}, so it is effort tied to {} that decides the overall result.",
            lagna_lord.lord.en(),
            lagna_lord.house,
            DIGNITY_EN[lagna_lord.dignity].to_lowercase(),
            theme(lagna_lord.house)
        )
    });

    if matches!(tone, Tone::Bad | Tone::Worst) {
        let c = culprit(rows);
        parts.push(if ne { REMEDY_NE[c] } else { REMEDY_EN[c] }.to_owned());
    }
    parts.push(
        if ne {
            PERSONAL_TONE_CLOSER_NE[ti]
        } else {
            PERSONAL_TONE_CLOSER_EN[ti]
        }
        .to_owned(),
    );
    parts.join(" ")
}

/// A component row; `notes` are (ne, en).
fn component(index: usize, value: f64, weight: f64, notes: &(String, String)) -> Value {
    json!({
        "key": PERSONAL_LAYER_KEYS[index],
        "label_ne": PERSONAL_LAYER_LABEL_NE[index], "label_en": PERSONAL_LAYER_LABEL_EN[index],
        "score": py_round(value, 4), "percent": percent(value), "weight": weight,
        "tone": Tone::for_score(value).key(), "note_ne": notes.0, "note_en": notes.1,
    })
}

fn dasha_note(d: &DashaBlock) -> (String, String) {
    (
        format!(
            "{} / {}",
            dasha::lord_ne(d.maha.lord),
            dasha::lord_ne(d.antar.lord)
        ),
        format!("{} / {}", d.maha.lord.en(), d.antar.lord.en()),
    )
}

/// The per-layer notes of a single day's components (`_components`).
fn day_note(index: usize, s: &PersonalScored) -> (String, String) {
    match PERSONAL_LAYER_KEYS[index] {
        "dasha" => dasha_note(&s.dasha),
        "rashi_lord" => (
            format!(
                "लग्नेश {} {} भावमा",
                s.rashi_lord.lord.ne(),
                s.rashi_lord.house
            ),
            format!(
                "Lagna lord {} in house {}",
                s.rashi_lord.lord.en(),
                s.rashi_lord.house
            ),
        ),
        "ashtakavarga" => (
            format!("जन्म सर्वाष्टकवर्ग {} बिन्दु", nepali_digits(s.ashtakavarga.sav)),
            format!("Natal Sarvashtakavarga {} bindus", s.ashtakavarga.sav),
        ),
        "chandrabala" => (
            format!("नवतारा {}", s.chandrabala.labels().0),
            format!("Navatara {}", s.chandrabala.tara_num),
        ),
        _ => (String::new(), String::new()),
    }
}

fn components(values: [f64; 8], period: Period, note: impl Fn(usize) -> (String, String)) -> Value {
    let weights = &PERSONAL_LAYER_WEIGHTS[period.index()];
    let mut order: Vec<usize> = (0..8).filter(|&i| weights[i] > 0.0).collect();
    order.sort_by(|&a, &b| {
        weights[b]
            .partial_cmp(&weights[a])
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Value::Array(
        order
            .into_iter()
            .map(|i| component(i, values[i], weights[i], &note(i)))
            .collect(),
    )
}

fn domain_json(key: usize, score: f64, value: f64, tenants: &[Graha]) -> Value {
    let mut houses: Vec<usize> = DOMAIN_HOUSES[key].iter().map(|&(h, _)| h).collect();
    houses.sort_unstable();
    json!({
        "key": DOMAIN_KEYS[key], "label_ne": DOMAIN_NE[key], "label_en": DOMAIN_EN[key],
        "score": score, "percent": percent(value), "tone": Tone::for_score(value).key(),
        "houses": houses, "karaka": DOMAIN_KARAKA[key].iter().map(|g| g.key()).collect::<Vec<_>>(),
        "tenants": tenants.iter().map(|g| g.key()).collect::<Vec<_>>(),
    })
}

/// `_natal_summary` + `_lucky_from_sign`.
fn header(natal: &NatalChart, out: &mut Map<String, Value>) {
    let (l, m, s) = (natal.lagna_sign, natal.moon_sign(), natal.sun_sign());
    let lord = SIGN_LORD[l];
    let i = lord.index();
    let number = LORD_NUMBER[i];
    let fields = json!({
        "lagna_sign": l + 1, "lagna_sign_ne": RASHI_NAMES_NE[l], "lagna_sign_en": RASHI_NAMES[l],
        "moon_sign": m + 1, "moon_sign_ne": RASHI_NAMES_NE[m], "moon_sign_en": RASHI_NAMES[m],
        "sun_sign": s + 1, "sun_sign_ne": RASHI_NAMES_NE[s], "sun_sign_en": RASHI_NAMES[s],
        "lucky_lord": lord.key(), "lucky_lord_ne": lord.ne(), "lucky_lord_en": lord.en(),
        "lucky_color_ne": LORD_COLOR_NE[i], "lucky_color_en": LORD_COLOR_EN[i],
        "lucky_number": number, "lucky_number_ne": nepali_digits(number), "lucky_number_en": number.to_string(),
        "lucky_direction_ne": LORD_DISHA_NE[i], "lucky_direction_en": LORD_DISHA_EN[i],
    });
    if let Value::Object(f) = fields {
        out.extend(f);
    }
}

/// `build_personal_sign_payload`.
pub(crate) fn personal_day(
    natal: &NatalChart,
    frame: &DayFrame,
    period: Period,
    as_of: UtcInstant,
) -> Map<String, Value> {
    let dasha = dasha_block(natal, natal.wall_of(as_of));
    let s = score_personal(natal, frame, period, &dasha);
    let tone = Tone::for_score(s.raw);
    let mut out = Map::new();
    header(natal, &mut out);
    out.insert("score".into(), json!(s.score));
    out.insert("percent".into(), json!(percent(s.raw)));
    out.insert("stars".into(), json!(tone.rank() + 1));
    out.insert("tone".into(), json!(tone.key()));
    out.insert("dasha".into(), dasha_json(&s.dasha, &natal.zone));
    out.insert("rashi_lord".into(), lord_json(&s.rashi_lord));
    out.insert(
        "components".into(),
        components(s.layer_scores(), period, |i| day_note(i, &s)),
    );
    out.insert(
        "domains".into(),
        Value::Array(
            s.domains
                .iter()
                .map(|d| domain_json(d.key, d.score, d.raw, &d.tenants))
                .collect(),
        ),
    );
    out.insert("gochar".into(), rows_json(&s.rows));
    let domains: Vec<(usize, f64)> = s.domains.iter().map(|d| (d.key, d.score)).collect();
    out.insert(
        "prediction_ne".into(),
        json!(compose(natal, tone, period, &s, &domains, Lang::Ne)),
    );
    out.insert(
        "prediction_en".into(),
        json!(compose(natal, tone, period, &s, &domains, Lang::En)),
    );
    out
}

#[expect(
    clippy::cast_precision_loss,
    reason = "a window holds at most ~130 days"
)]
fn mean(values: impl Iterator<Item = f64>, n: usize) -> f64 {
    values.fold(0.0, |acc, v| acc + v) / n as f64
}

/// `aggregate_personal`.
pub(crate) fn personal_window(
    natal: &NatalChart,
    frames: &[DayFrame],
    period: Period,
    as_of: UtcInstant,
) -> Map<String, Value> {
    let dasha = dasha_block(natal, natal.wall_of(as_of));
    let scored: Vec<PersonalScored> = frames
        .iter()
        .map(|f| score_personal(natal, f, period, &dasha))
        .collect();
    let n = scored.len();
    let avg = mean(scored.iter().map(|s| s.score), n);
    let (mut best_i, mut worst_i) = (0, 0);
    for (i, s) in scored.iter().enumerate() {
        if s.score > scored[best_i].score {
            best_i = i;
        }
        if s.score < scored[worst_i].score {
            worst_i = i;
        }
    }
    let (best, worst) = (scored[best_i].score, scored[worst_i].score);
    let peak = if worst.abs() > best.abs() {
        worst
    } else {
        best
    };
    let score = clamp(avg * (1.0 - AGGREGATE_PEAK_WEIGHT) + peak * AGGREGATE_PEAK_WEIGHT);
    let tone = Tone::for_score(score);
    let mid = &scored[n / 2];

    let mut layer_means = [0.0; 8];
    for (k, slot) in layer_means.iter_mut().enumerate() {
        *slot = mean(scored.iter().map(|s| s.layer_scores()[k]), n);
    }
    let domain_values: Vec<f64> = (0..DOMAIN_KEYS.len())
        .map(|i| clamp(mean(scored.iter().map(|s| s.domains[i].score), n)))
        .collect();
    let domain_rounded: Vec<(usize, f64)> = domain_values
        .iter()
        .enumerate()
        .map(|(i, &v)| (i, py_round(v, 4)))
        .collect();

    let mut out = Map::new();
    header(natal, &mut out);
    out.insert("score".into(), json!(py_round(score, 4)));
    out.insert("percent".into(), json!(percent(score)));
    out.insert("stars".into(), json!(tone.rank() + 1));
    out.insert("tone".into(), json!(tone.key()));
    out.insert("dasha".into(), dasha_json(&mid.dasha, &natal.zone));
    out.insert("rashi_lord".into(), lord_json(&mid.rashi_lord));
    out.insert(
        "components".into(),
        components(layer_means, period, |i| {
            if PERSONAL_LAYER_KEYS[i] == "dasha" {
                dasha_note(&mid.dasha)
            } else {
                (String::new(), String::new())
            }
        }),
    );
    out.insert(
        "domains".into(),
        Value::Array(
            domain_rounded
                .iter()
                .map(|&(i, r)| domain_json(i, r, domain_values[i], &mid.domains[i].tenants))
                .collect(),
        ),
    );
    out.insert("gochar".into(), rows_json(&mid.rows));
    out.insert("days_in_period".into(), json!(frames.len()));
    out.insert(
        "prediction_ne".into(),
        json!(compose(natal, tone, period, mid, &domain_rounded, Lang::Ne)),
    );
    out.insert(
        "prediction_en".into(),
        json!(compose(natal, tone, period, mid, &domain_rounded, Lang::En)),
    );
    out
}

#[cfg(test)]
mod tests {
    use super::{Support, favourable_sentence};

    fn support(nepali: &str, bindu: Option<&str>) -> String {
        favourable_sentence(&Support {
            ne: nepali == "ne",
            graha: "Rahu",
            sign: "Mesha",
            house_text: "5",
            house: 5,
            bindu: bindu.map(str::to_owned),
            theme: "children and study",
        })
    }

    #[test]
    fn a_bindu_count_is_quoted_when_the_graha_has_one() {
        assert_eq!(
            support("en", Some("4")),
            "Rahu transits Mesha into house 5, where your natal Ashtakavarga holds 4 bindus — direct support for children and study."
        );
        assert!(support("ne", Some("४")).contains("४ बिन्दु छन्"));
    }

    #[test]
    fn rahu_and_ketu_never_read_none_bindus() {
        for text in [support("en", None), support("ne", None)] {
            assert!(!text.contains("None"), "{text}");
            assert!(!text.contains("bindus") && !text.contains("बिन्दु"), "{text}");
        }
        assert_eq!(
            support("en", None),
            "Rahu transits Mesha into house 5 — direct support for children and study."
        );
    }
}
