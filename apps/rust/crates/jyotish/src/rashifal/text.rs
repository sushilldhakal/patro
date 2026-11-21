//! The words: `_layer_note`, `_sav_note` and `_compose_prediction`.

use panchanga::{RASHI_NAMES, RASHI_NAMES_NE, nepali_digits};

use super::{
    Period, Tone,
    layers::{Chandrabala, Cycle, GocharRow, Moorti, RashiLord, Scored, VaaraHora},
    tables::{
        DIGNITY_EN, DIGNITY_NE, DOMAIN_EN, DOMAIN_HOUSES, DOMAIN_NE, HOUSE_THEME_EN,
        HOUSE_THEME_NE, MOORTI_EN, MOORTI_NE, PERIOD_EN, PERIOD_NE, RELATION_EN, RELATION_NE,
        REMEDY_EN, REMEDY_NE, TONE_CLOSER_EN, TONE_CLOSER_NE, TONE_OPENER_EN, TONE_OPENER_NE,
    },
};

/// Output language of a sentence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Lang {
    Ne,
    En,
}

impl Lang {
    pub(crate) const BOTH: [Self; 2] = [Self::Ne, Self::En];

    fn ne(self) -> bool {
        self == Self::Ne
    }
}

/// `_num`: a count in the script of the sentence around it.
fn num(value: usize, lang: Lang) -> String {
    if lang.ne() {
        nepali_digits(value)
    } else {
        value.to_string()
    }
}

/// `_graha_list`.
fn graha_list(names: &[&str], lang: Lang) -> String {
    if lang.ne() || names.len() < 2 {
        return names.join(", ");
    }
    format!(
        "{} and {}",
        names[..names.len() - 1].join(", "),
        names[names.len() - 1]
    )
}

/// `_layer_note(key, block, lang)` for the layer at `index` in `LAYER_KEYS`.
pub(crate) fn layer_note(index: usize, s: &Scored, lang: Lang) -> String {
    let ne = lang.ne();
    match index {
        1 => {
            let (tara, quality, tara_en, quality_en) = s.chandrabala.labels();
            if ne {
                format!("नवतारा {tara} ({quality})")
            } else {
                format!("Navatara {tara_en} — {}", quality_en.to_lowercase())
            }
        }
        2 => {
            let m = &s.moorti;
            if ne {
                format!(
                    "गोचर चन्द्र {} भाव — मूर्ति {}",
                    m.house_from_moon, MOORTI_NE[m.kind]
                )
            } else {
                format!(
                    "Transit Moon in house {} — {} moorti",
                    m.house_from_moon, MOORTI_EN[m.kind]
                )
            }
        }
        3 => {
            if ne {
                format!("सर्वाष्टकवर्ग {} बिन्दु", nepali_digits(s.ashtakavarga.sav))
            } else {
                format!("Sarvashtakavarga {} bindus", s.ashtakavarga.sav)
            }
        }
        4 => {
            let l = &s.rashi_lord;
            if ne {
                format!(
                    "राशिस्वामी {} {} भावमा, {}",
                    l.lord.ne(),
                    l.house,
                    DIGNITY_NE[l.dignity]
                )
            } else {
                format!(
                    "Sign lord {} in house {}, {}",
                    l.lord.en(),
                    l.house,
                    DIGNITY_EN[l.dignity].to_lowercase()
                )
            }
        }
        5 => if ne {
            "लग्न, चन्द्र र सूर्य — तीनै चक्रको संयुक्त फल"
        } else {
            "Combined verdict of the lagna, Chandra and Surya chakras"
        }
        .to_owned(),
        6 => {
            let c = &s.cycle;
            if ne {
                format!("{} {} भावमा", c.graha.ne(), c.house)
            } else {
                format!("{} in house {}", c.graha.en(), c.house)
            }
        }
        7 => {
            let v = &s.vaara;
            if ne {
                format!(
                    "वारपति {} — राशिस्वामीसँग {}",
                    v.day_lord.ne(),
                    RELATION_NE[v.relation]
                )
            } else {
                format!(
                    "Day lord {} — {} to the sign lord",
                    v.day_lord.en(),
                    RELATION_EN[v.relation]
                )
            }
        }
        _ => String::new(),
    }
}

/// `_primary_house`: the house a domain is weighted 1.0 on (its first, highest entry).
fn primary_house(domain: usize) -> usize {
    let houses = DOMAIN_HOUSES[domain];
    let mut best = houses[0];
    for &(h, w) in &houses[1..] {
        if w > best.1 {
            best = (h, w);
        }
    }
    best.0
}

/// `_sav_note`.
fn sav_note(sav: u32, lang: Lang) -> String {
    let ne = lang.ne();
    let count = if ne {
        nepali_digits(sav)
    } else {
        sav.to_string()
    };
    if sav >= 30 {
        return if ne {
            format!(
                "अष्टकवर्गमा यस राशिमा {count} बिन्दु छन् — औसतभन्दा बलियो आधार, जसले प्रतिकूल गोचरको असर पनि खुम्च्याइदिन्छ।"
            )
        } else {
            format!(
                "The sign holds {count} Ashtakavarga bindus — an above-average base, which blunts even an adverse transit."
            )
        };
    }
    if sav <= 25 {
        return if ne {
            format!(
                "अष्टकवर्गमा यस राशिमा {count} बिन्दु मात्र छन् — आधार पातलो भएकाले अनुकूल गोचरको फल पनि पूरै नआउन सक्छ।"
            )
        } else {
            format!(
                "The sign holds only {count} Ashtakavarga bindus — a thin base, so even a favourable transit may not deliver in full."
            )
        };
    }
    if ne {
        format!("अष्टकवर्गमा यस राशिमा {count} बिन्दु छन् — औसत आधार, जसले गोचरको फल जस्ताको तस्तै देखाउँछ।")
    } else {
        format!(
            "The sign holds {count} Ashtakavarga bindus — an average base, which lets the transits read much as they stand."
        )
    }
}

/// `max(rows, key=lambda r: abs(r["score"]) * r["weight"])`: the first of equals.
fn loudest(rows: &[GocharRow]) -> &GocharRow {
    let mut best = &rows[0];
    for r in &rows[1..] {
        if r.score.abs() * r.weight > best.score.abs() * best.weight {
            best = r;
        }
    }
    best
}

/// `min(rows, key=lambda r: r["score"] * r["weight"])["graha"]`.
pub(crate) fn culprit(rows: &[GocharRow]) -> usize {
    let mut best = &rows[0];
    for r in &rows[1..] {
        if r.score * r.weight < best.score * best.weight {
            best = r;
        }
    }
    best.graha.index()
}

/// `_remedy_for`.
pub(crate) fn remedy(rows: &[GocharRow], lang: Lang) -> &'static str {
    let i = culprit(rows);
    if lang.ne() {
        REMEDY_NE[i]
    } else {
        REMEDY_EN[i]
    }
}

/// What `_compose_prediction` reads.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Inputs<'a> {
    pub(crate) tone: Tone,
    pub(crate) period: Period,
    pub(crate) rows: &'a [GocharRow],
    /// (domain index, rounded score), in `DOMAIN_KEYS` order.
    pub(crate) domains: &'a [(usize, f64)],
    pub(crate) lord: &'a RashiLord,
    pub(crate) chandra: &'a Chandrabala,
    pub(crate) moorti: &'a Moorti,
    pub(crate) sav: u32,
    pub(crate) cycle: &'a Cycle,
    pub(crate) vaara: &'a VaaraHora,
}

/// `_compose_prediction`.
#[expect(
    clippy::too_many_lines,
    reason = "one sentence per layer, as in Python"
)]
pub(crate) fn compose(inp: &Inputs<'_>, lang: Lang) -> String {
    let ne = lang.ne();
    let pi = inp.period.index();
    let ti = inp.tone.rank();
    let period_word = if ne { PERIOD_NE[pi] } else { PERIOD_EN[pi] };
    let opener = if ne {
        TONE_OPENER_NE[ti]
    } else {
        TONE_OPENER_EN[ti]
    };
    let mut parts: Vec<String> = vec![opener.replace("{period}", period_word)];

    // sorted(domains, key=score, reverse=True): stable, so equals keep their order.
    let mut ranked: Vec<(usize, f64)> = inp.domains.to_vec();
    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let (strong, weak) = (ranked[0], ranked[ranked.len() - 1]);
    if strong.1 > 0.08 {
        let house = primary_house(strong.0);
        parts.push(if ne {
            format!(
                "{} पक्ष बलियो छ — {}मा ध्यान दिँदा प्रतिफल मिल्छ।",
                DOMAIN_NE[strong.0], HOUSE_THEME_NE[house]
            )
        } else {
            format!(
                "{} is the strong side — attention to {} pays off.",
                DOMAIN_EN[strong.0], HOUSE_THEME_EN[house]
            )
        });
    }
    if weak.1 < -0.08 {
        let house = primary_house(weak.0);
        parts.push(if ne {
            format!(
                "{} पक्षमा भने सतर्कता चाहिन्छ; {}सँग जोडिएका कुरामा हतार नगर्नुहोस्।",
                DOMAIN_NE[weak.0], HOUSE_THEME_NE[house]
            )
        } else {
            format!(
                "Take extra care on the {} side — do not rush what touches {}.",
                DOMAIN_EN[weak.0].to_lowercase(),
                HOUSE_THEME_EN[house]
            )
        });
    }

    let loud = loudest(inp.rows);
    let loud_house = num(loud.house, lang);
    let loud_sign = if ne {
        RASHI_NAMES_NE[loud.sign]
    } else {
        RASHI_NAMES[loud.sign]
    };
    let house = loud.house;
    if let Some(blocker) = loud.vedha_by {
        parts.push(if ne {
            format!(
                "{} {loud_sign} राशि हुँदै {loud_house} भावमा छन् तर {}को वेध परेकाले फल रोकिन्छ — नतिजा ढिलो आउँछ।",
                loud.graha.ne(),
                blocker.ne()
            )
        } else {
            format!(
                "{} moves through {loud_sign} into house {house} but {} obstructs it, so the result stalls and arrives late.",
                loud.graha.en(),
                blocker.en()
            )
        });
    } else if loud.favourable {
        parts.push(if ne {
            format!(
                "{} {loud_sign} राशिबाट {loud_house} भावमा रहेकाले {}मा प्रत्यक्ष साथ मिल्छ।",
                loud.graha.ne(),
                HOUSE_THEME_NE[house]
            )
        } else {
            format!(
                "{} transiting {loud_sign} into house {house} gives direct support to {}.",
                loud.graha.en(),
                HOUSE_THEME_EN[house]
            )
        });
    } else {
        parts.push(if ne {
            format!(
                "{} {loud_sign} राशिबाट {loud_house} भावमा रहेकाले {}मा दबाब पर्न सक्छ; यसै क्षेत्रमा बढी सचेत रहनुहोस्।",
                loud.graha.ne(),
                HOUSE_THEME_NE[house]
            )
        } else {
            format!(
                "{} in {loud_sign}, house {house}, can press on {} — that is the area to stay alert in.",
                loud.graha.en(),
                HOUSE_THEME_EN[house]
            )
        });
    }

    let name = |r: &GocharRow| if ne { r.graha.ne() } else { r.graha.en() };
    let vakri: Vec<&str> = inp.rows.iter().filter(|r| r.retrograde).map(name).collect();
    let asta: Vec<&str> = inp.rows.iter().filter(|r| r.combust).map(name).collect();
    if !vakri.is_empty() {
        let names = graha_list(&vakri, lang);
        let verb = if vakri.len() == 1 { "stands" } else { "stand" };
        parts.push(if ne {
            format!(
                "{names} वक्री रहेकाले अघि सुरु गरेर अलपत्र परेका काम फेरि अगाडि आउँछन् — नयाँ थाल्नुभन्दा अधुरो काम टुङ्ग्याउन यो समय राम्रो हो।"
            )
        } else {
            format!(
                "{names} {verb} retrograde, so unfinished business started earlier resurfaces — a better window for closing what is open than for starting something new."
            )
        });
    }
    if !asta.is_empty() {
        let names = graha_list(&asta, lang);
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

    parts.push(sav_note(inp.sav, lang));

    let sign_lord = inp.lord;
    parts.push(if ne {
        format!(
            "राशिस्वामी {} {} भावमा {} अवस्थामा छन्, त्यसैले {}सँग जोडिएको प्रयासले नै समग्र फल निर्धारण गर्छ।",
            sign_lord.lord.ne(),
            num(sign_lord.house, lang),
            DIGNITY_NE[sign_lord.dignity],
            HOUSE_THEME_NE[sign_lord.house]
        )
    } else {
        format!(
            "The sign lord {} stands in house {}, {}, so effort tied to {} is what decides the overall result.",
            sign_lord.lord.en(),
            sign_lord.house,
            DIGNITY_EN[sign_lord.dignity].to_lowercase(),
            HOUSE_THEME_EN[sign_lord.house]
        )
    });

    if matches!(inp.period, Period::Daily | Period::Weekly) {
        let (tara, quality, tara_en, quality_en) = inp.chandra.labels();
        let moorti = inp.moorti;
        parts.push(if ne {
            format!(
                "चन्द्रबल {tara} ({quality}) र गोचर चन्द्र जन्म राशिबाट {} भावमा — मूर्ति {}।",
                num(moorti.house_from_moon, lang),
                MOORTI_NE[moorti.kind]
            )
        } else {
            format!(
                "Chandrabala is {tara_en} ({}), with the transit Moon {} houses from the sign — a {} moorti.",
                quality_en.to_lowercase(),
                moorti.house_from_moon,
                MOORTI_EN[moorti.kind]
            )
        });
        let vaara = inp.vaara;
        parts.push(if ne {
            format!(
                "वारपति {} राशिस्वामीसँग {} छन्।",
                vaara.day_lord.ne(),
                RELATION_NE[vaara.relation]
            )
        } else {
            format!(
                "The day lord {} is {}.",
                vaara.day_lord.en(),
                RELATION_EN[vaara.relation]
            )
        });
    } else {
        let cycle = inp.cycle;
        parts.push(if ne {
            format!(
                "{period_word}को कालचक्रमा {} {} राशि हुँदै {} भावमा छन्, जसले सिङ्गो अवधिको गति निर्धारण गर्छ।",
                cycle.graha.ne(),
                RASHI_NAMES_NE[cycle.sign],
                num(cycle.house, lang)
            )
        } else {
            format!(
                "For {} the time-lord {} runs through {} in house {}, setting the pace of the whole window.",
                period_word.to_lowercase(),
                cycle.graha.en(),
                RASHI_NAMES[cycle.sign],
                cycle.house
            )
        });
    }

    if matches!(inp.tone, Tone::Bad | Tone::Worst) {
        parts.push(remedy(inp.rows, lang).to_owned());
    }
    parts.push(
        if ne {
            TONE_CLOSER_NE[ti]
        } else {
            TONE_CLOSER_EN[ti]
        }
        .to_owned(),
    );
    parts.join(" ")
}
