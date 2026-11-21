//! `build_sections(chart, now, lang)`: the report's sections, in order.

use super::{
    Confidence, Ctx, DASHA_THEME, DASHA_THEME_NE, DIGNITY_PHRASE, DIGNITY_PHRASE_NE, Graha,
    HOUSE_THEME, HOUSE_THEME_NE, KARAKA, KARAKA_NE, NAKSHATRA_EN, NAKSHATRA_NE, RASHI_EN, RASHI_NE,
    SIGN_TRAIT_EN, SIGN_TRAIT_NE, Section, VARGA_DOMAIN, capitalize, date, divisional_item, en,
    fmt_date, head, item, item_factors, life_journey, natural_benefic, natural_malefic, ne_name,
    ord, ord_ne, phrase, phrase_ne, plain, pursue, score, status_ne, strength_word, strong_status,
    weak_status, yoga_item,
};
use crate::{chart::Dignity, dasha};

fn dedupe(names: impl Iterator<Item = String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for n in names {
        if !out.contains(&n) {
            out.push(n);
        }
    }
    out
}

#[expect(
    clippy::too_many_lines,
    reason = "one block per section, in the source's order"
)]
pub(super) fn build(ctx: &Ctx<'_>) -> Vec<Section> {
    let c = ctx.chart;
    let ne = ctx.ne;
    let now = ctx.now;
    let mut sections = Vec::new();
    let lagna_lord = c.lord(1);
    let ll = c.p(lagna_lord);
    let moon = c.p(Graha::Moon);
    let sun = c.p(Graha::Sun);
    let d = c.dasha.as_ref();

    // 1 — Executive summary.
    let mut summary_conf = Confidence::default();
    if score(ll.dignity) >= 2 {
        summary_conf.support(format!("D1: lagna lord {} dignified", en(lagna_lord)));
    } else if score(ll.dignity) <= -2 {
        summary_conf.against(format!("D1: lagna lord {} debilitated", en(lagna_lord)));
    }
    if ll.vargottama {
        summary_conf.support("D9: lagna lord vargottama");
    }
    if strong_status(ll.shadbala_status.as_deref()) {
        summary_conf.support("Shadbala: lagna lord strong");
    } else if weak_status(ll.shadbala_status.as_deref()) {
        summary_conf.against("Shadbala: lagna lord weak");
    }
    let benefic_yogas: Vec<_> = ctx
        .yogas
        .iter()
        .filter(|y| y.polarity == "benefic")
        .collect();
    if !benefic_yogas.is_empty() {
        summary_conf.support(format!(
            "Yogas: {} supportive combination(s)",
            benefic_yogas.len()
        ));
    }
    let nak_i = moon.nakshatra;
    let mut summary_body = if ne {
        vec![
            format!(
                "तीन कुराले तपाईंको सिंगो कुण्डलीको स्वर तय गर्छन्: तपाईंको लग्न (मानिससामु \
                 कस्तो देखिनुहुन्छ), तपाईंको चन्द्र (भावना र मन), र तपाईंको सूर्य (भित्री मूल \
                 स्वरूप)। यहाँ, {} लग्न छ, चन्द्र {} राशिमा (जन्म तारा {}), र सूर्य {} राशिमा।",
                RASHI_NE[c.lagna_sign],
                RASHI_NE[c.moon_sign],
                NAKSHATRA_NE[nak_i],
                RASHI_NE[c.sun_sign]
            ),
            format!(
                "सरल भाषामा भन्दा, तपाईं अरूसामु {} व्यक्तिका रूपमा देखिनुहुन्छ।",
                SIGN_TRAIT_NE[c.lagna_sign]
            ),
            format!(
                "तपाईंको लग्नको स्वामी ग्रह {} {} भावमा, यहाँ {} — यसैले समग्रमा तपाईंको कुण्डली {} आधारमा टिकेको छ।",
                ne_name(lagna_lord),
                ord_ne(ll.house),
                phrase_ne(ll.dignity, "रहेको"),
                strength_word(summary_conf.level(), true)
            ),
        ]
    } else {
        vec![
            format!(
                "Three things set the tone of your whole chart: your rising sign (how you come \
                 across to others), your Moon (your emotions and mind), and your Sun (your core \
                 self). Here, {} is rising, your Moon is in {} (birth star {}), and your Sun is in {}.",
                RASHI_EN[c.lagna_sign],
                RASHI_EN[c.moon_sign],
                NAKSHATRA_EN[nak_i],
                RASHI_EN[c.sun_sign]
            ),
            format!(
                "In plain terms, you tend to come across to others as {}.",
                SIGN_TRAIT_EN[c.lagna_sign]
            ),
            format!(
                "The planet ruling your rising sign, {}, is in your {} house and {} there, so overall \
                 your chart rests on {} foundation.",
                en(lagna_lord),
                ord(ll.house),
                phrase(ll.dignity, "placed"),
                strength_word(summary_conf.level(), false)
            ),
        ]
    };
    if let Some(d) = d {
        summary_body.push(if ne {
            format!(
                "अहिलेको समय: तपाईं {} को मुख्य जीवन-कालखण्ड (महादशा) मा हुनुहुन्छ, जुन {} सम्म रहन्छ; \
                 यसभित्रको हालको उप-कालखण्ड (अन्तर्दशा) {} को हो, {} – {}। मिति सहितको पूरा तालिका \
                 'जीवन-कालखण्ड तालिका' खण्डमा छ।",
                ne_name(d.maha_lord),
                date(d.maha_end, true),
                ne_name(d.antar_lord),
                date(d.antar_start, true),
                date(d.antar_end, true)
            )
        } else {
            format!(
                "Where you are now: you're in {}'s main life period (mahadasha) until {}, and the \
                 current sub-phase within it (antardasha) belongs to {}, running {} – {}. The \
                 Life-period timeline section gives the full schedule with dates.",
                en(d.maha_lord),
                fmt_date(d.maha_end),
                en(d.antar_lord),
                fmt_date(d.antar_start),
                fmt_date(d.antar_end)
            )
        });
    }
    if !benefic_yogas.is_empty() {
        summary_body.push(if ne {
            format!(
                "तपाईंको कुण्डलीमा सक्रिय राम्रा संयोगहरू (योग): {} — यिनको अर्थ तल 'योग' खण्डमा सजिलो भाषामा दिइएको छ।",
                dedupe(benefic_yogas.iter().map(|y| y.name_ne.clone())).join(", ")
            )
        } else {
            format!(
                "Helpful combinations (yogas) active in your chart: {} — each is explained in plain \
                 words in the Yogas section below.",
                dedupe(benefic_yogas.iter().map(|y| y.name.clone())).join(", ")
            )
        });
    }
    sections.push(
        Section::new(
            "executive_summary",
            "Executive summary",
            "सारांश",
            summary_body,
        )
        .conf(summary_conf),
    );

    // 2 — Personality.
    let pers_conf = ctx.planet_conf(lagna_lord);
    let pers_body = if ne {
        vec![
            format!(
                "मानिससामु तपाईं प्रायः {} व्यक्तिका रूपमा देखिनुहुन्छ ({} लग्न)।",
                SIGN_TRAIT_NE[c.lagna_sign], RASHI_NE[c.lagna_sign]
            ),
            format!(
                "तपाईं आफूलाई कसरी प्रस्तुत गर्नुहुन्छ भन्नेमा {} ग्रहको सबैभन्दा ठूलो हात हुन्छ, त्यसैले {} \
                 तपाईंको बाहिरी शैलीको ठूलो हिस्सा हो।",
                ne_name(lagna_lord),
                plain(lagna_lord, true)
            ),
            format!(
                "भित्री रूपमा, तपाईंको आत्म-छवि र इच्छाशक्ति {} वरिपरि बनेको हुन्छ (सूर्य {} राशिमा)।",
                plain(Graha::Sun, true),
                RASHI_NE[sun.sign]
            ),
            format!(
                "तपाईं कसरी सोच्नुहुन्छ र कुरा गर्नुहुन्छ भन्ने बुधले देखाउँछ — तपाईंको मन {} तर्फ ढल्किन्छ।",
                plain(Graha::Mercury, true)
            ),
        ]
    } else {
        vec![
            format!(
                "To other people, you usually come across as {} ({} rising).",
                SIGN_TRAIT_EN[c.lagna_sign], RASHI_EN[c.lagna_sign]
            ),
            format!(
                "How you present yourself is shaped most by {} (the planet ruling your rising sign), \
                 so {} is a big part of your outward style.",
                en(lagna_lord),
                plain(lagna_lord, false)
            ),
            format!(
                "Deeper down, your sense of self and drive is built around {} (your Sun is in {}).",
                plain(Graha::Sun, false),
                RASHI_EN[sun.sign]
            ),
            format!(
                "The way you think and communicate leans toward {}.",
                plain(Graha::Mercury, false)
            ),
        ]
    };
    sections.push(
        Section::new(
            "personality",
            "Personality & temperament",
            "व्यक्तित्व",
            pers_body,
        )
        .conf(pers_conf),
    );

    // 3 — Emotional nature.
    let emo_conf = ctx.planet_conf(Graha::Moon);
    let steady = score(moon.dignity) >= 1;
    let mut emo_body = if ne {
        vec![
            format!(
                "भावनात्मक रूपमा, तपाईं प्रायः {} हुनुहुन्छ (चन्द्र {} राशिमा)।",
                SIGN_TRAIT_NE[moon.sign], RASHI_NE[moon.sign]
            ),
            format!(
                "तपाईंलाई भावनात्मक सुरक्षा मुख्यतया {} सँग जोडिएको हुन्छ। {}",
                HOUSE_THEME_NE[moon.house],
                if steady {
                    "तपाईंको मन स्वाभाविक रूपमा स्थिर रहन्छ।"
                } else {
                    "विचारपूर्वक विश्राम, नियमित दिनचर्या र सहयोगी सङ्गतले तपाईंको मनलाई शान्त राख्न स्पष्ट फाइदा दिन्छ।"
                }
            ),
        ]
    } else {
        vec![
            format!(
                "Emotionally, you tend to be {} (your Moon is in {}).",
                SIGN_TRAIT_EN[moon.sign], RASHI_EN[moon.sign]
            ),
            format!(
                "Your sense of emotional security is mainly tied to {}. {}",
                HOUSE_THEME[moon.house],
                if steady {
                    "Your mind tends to stay naturally steady."
                } else {
                    "Deliberate rest, a regular routine and supportive company clearly help keep you calm and settled."
                }
            ),
        ]
    };
    let ben: Vec<Graha> = c
        .aspects_to(moon.house)
        .into_iter()
        .filter(|g| natural_benefic(*g))
        .collect();
    if !ben.is_empty() {
        emo_body.push(if ne {
            format!(
                "{} को सहयोगी प्रभावले मनलाई अतिरिक्त सुरक्षा र आशावाद दिन्छ।",
                ben.iter().map(|g| ne_name(*g)).collect::<Vec<_>>().join(", ")
            )
        } else {
            format!(
                "A helpful, friendly influence from {} lends the mind extra protection and optimism.",
                ben.iter().map(|g| en(*g)).collect::<Vec<_>>().join(", ")
            )
        });
    }
    sections.push(
        Section::new(
            "emotional_nature",
            "Emotional nature",
            "भावनात्मक स्वभाव",
            emo_body,
        )
        .conf(emo_conf),
    );

    // 4 — Strengths.
    let mut order: Vec<Graha> = Graha::ALL.to_vec();
    order.sort_by(|a, b| {
        let r = |g: &Graha| c.p(*g).shadbala_ratio.unwrap_or(0.0);
        r(b).partial_cmp(&r(a)).unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut str_conf = Confidence::default();
    let mut strong_themes = Vec::new();
    for g in order {
        let pf = c.p(g);
        if pf.dignity_in(&[Dignity::Exalted, Dignity::Own, Dignity::Moolatrikona])
            || strong_status(pf.shadbala_status.as_deref())
        {
            strong_themes.push(plain(g, ne));
            str_conf.support(format!("{} dignified/strong", en(g)));
        }
    }
    let strengths = if strong_themes.is_empty() {
        if ne {
            "कुनै ग्रह विशेष रूपमा बलियो छैन, तर धेरै ठीकठाक छन्; तपाईंको बल तयार भई आउनुभन्दा मिहिनेतबाट बन्दै जान्छ।".to_owned()
        } else {
            "No single area stands out as exceptionally strong, but several are solid; your strengths \
             build through effort rather than arriving ready-made."
                .to_owned()
        }
    } else {
        let joined = strong_themes.join("; ");
        if ne {
            format!(
                "तपाईंको सबैभन्दा बलियो पक्षहरू यी हुन्: {joined}। यी कुरा तपाईंलाई स्वाभाविक रूपमै सजिलै आउँछन्, \
                 त्यसैले तपाईं यिनमा भरोसा गरेर अगाडि बढ्न सक्नुहुन्छ।"
            )
        } else {
            format!(
                "Your strongest areas are: {joined}. These come more naturally to you, so you can lean \
                 on them and build on them with confidence."
            )
        }
    };
    sections.push(
        Section::new("strengths", "Core strengths", "बल पक्ष", vec![strengths]).conf(str_conf),
    );

    // 5 — Challenges.
    let mut challenges = Vec::new();
    let mut ch_conf = Confidence::default();
    for g in Graha::ALL {
        let pf = c.p(g);
        if !(pf.is(Dignity::Debilitated) || weak_status(pf.shadbala_status.as_deref())) {
            continue;
        }
        let prefix = format!("neechabhanga_{}", g.key());
        let cancelled = ctx.yogas.iter().any(|y| y.key.starts_with(&prefix));
        let theme = plain(g, ne);
        let line = if ne {
            let mut l =
                format!("{theme} — यी कुरा तुरुन्तै सहजै नआउन सक्छन्, र यिनमा सचेत प्रयास तथा अभ्यास चाहिन्छ।");
            if cancelled {
                l += " राम्रो कुरा — यहाँ यो कमजोरी रद्द गर्ने संयोग (नीचभंग) छ, जसले यसलाई पछि गएर बलमा बदल्न सक्छ।";
            }
            l
        } else {
            let mut l = format!(
                "{} may not come as easily to you, and can take conscious effort and practice.",
                capitalize(theme)
            );
            if cancelled {
                l += " The good news: a pattern that cancels this weakness (neecha-bhanga) tends to turn it into strength later on.";
            }
            l
        };
        challenges.push(line);
        ch_conf.against(format!("{} weak/debilitated", en(g)));
    }
    if challenges.is_empty() {
        challenges.push(if ne {
            "कुनै ग्रह गम्भीर रूपमा पीडित छैन — चुनौतीहरू प्रायः परिस्थितिजन्य हुन्, गहिरो जरा गाडेका होइनन्।".into()
        } else {
            "No planet is severely afflicted — challenges are likely situational rather than deep-seated.".into()
        });
    }
    challenges.push(if ne {
        "यिनलाई विकासका किनाराका रूपमा हेर्नुहोस् — धैर्य र सीप निर्माणले फल दिने क्षेत्र, स्थायी सीमा होइन।".into()
    } else {
        "Treat these as growth edges: areas that reward patience and skill-building, not fixed limitations.".into()
    });
    sections
        .push(Section::new("challenges", "Growth challenges", "चुनौती", challenges).conf(ch_conf));

    // 6 — Career.
    let car_conf = ctx.house_conf(10);
    let tenth = c.lord(10);
    let tl = c.p(tenth);
    let mut car_body = vec![ctx.signified(10, ne)];
    if ne {
        car_body.push(format!(
            "तपाईंको करियरको दिशा, करियर हेर्ने ग्रह {} तपाईंको {} भावमा जानुले तय गर्छ — त्यसैले सार्वजनिक काम \
             {} सँग मिसिन्छ।",
            ne_name(tenth),
            ord_ne(tl.house),
            head(HOUSE_THEME_NE[tl.house])
        ));
        car_body.push("सूर्य र शनि मिलेर काममा अधिकार/चिनारी र अनुशासित मिहिनेतको सन्तुलन देखाउँछन्।".into());
        if let Some(m) = ctx.maha() {
            car_body.push(format!(
                "अहिले तपाईं {} को मुख्य जीवन-कालखण्डमा हुनुहुन्छ, जसले हाल करियरलाई {} ले रङ्ग्याउँछ।",
                ne_name(m),
                DASHA_THEME_NE[m.index()]
            ));
        }
    } else {
        car_body.push(format!(
            "Your career direction is set by the planet that rules your career area, {}, moving into \
             your {} house — so your public work blends with {}.",
            en(tenth),
            ord(tl.house),
            head(HOUSE_THEME[tl.house])
        ));
        car_body.push(
            "Sun and Saturn together describe the balance between authority/visibility and disciplined \
             hard work in your working life."
                .into(),
        );
        if let Some(m) = ctx.maha() {
            car_body.push(format!(
                "You're currently in {}'s main life period, which right now colours your career with {}.",
                en(m),
                DASHA_THEME[m.index()]
            ));
        }
    }
    sections
        .push(Section::new("career", "Career & vocation", "पेशा / कर्म", car_body).conf(car_conf));

    // 7 — Finances.
    let mut fin_conf = ctx.house_conf(2);
    let fin2 = ctx.house_conf(11);
    for f in fin2.supports {
        fin_conf.support(f);
    }
    for f in fin2.contradicts {
        fin_conf.against(f);
    }
    let dhana = ctx.yogas.iter().any(|y| y.key.contains("dhana"));
    if dhana {
        fin_conf.support("Yoga: Dhana yoga present");
    }
    let jup = c.p(Graha::Jupiter);
    let mut fin_body = vec![ctx.signified(2, ne), ctx.signified(11, ne)];
    if ne {
        fin_body.push(format!(
            "धन र समृद्धिसँग सम्बन्धित ग्रह बृहस्पति {} राशिको {} भावमा छ — यहाँ {}।",
            RASHI_NE[jup.sign],
            ord_ne(jup.house),
            phrase_ne(jup.dignity, "रहेको")
        ));
        if dhana {
            fin_body.push("धन-निर्माण गर्ने धन योगले नियमित कमाइ र बचतको बानीबाट संचयलाई सघाउँछ।".into());
        }
        fin_body.push(
            "वित्त व्यवस्थित बचतमा राम्रो प्रतिक्रिया दिन्छ; कुण्डलीले प्रवृत्ति देखाउँछ, बानीले नतिजा तय गर्छ।"
                .into(),
        );
    } else {
        fin_body.push(format!(
            "Jupiter, the planet naturally linked to wealth and good fortune, is in {} (your {} house) — {} there.",
            RASHI_EN[jup.sign],
            ord(jup.house),
            phrase(jup.dignity, "placed")
        ));
        if dhana {
            fin_body.push("A wealth-forming Dhana yoga supports accumulation through steady earning and saving habits.".into());
        }
        fin_body.push("Finances respond best to systematic saving; the chart describes tendencies, while habits decide outcomes.".into());
    }
    sections
        .push(Section::new("finances", "Finances & wealth", "धन / वित्त", fin_body).conf(fin_conf));

    // 8 — Relationships.
    let mut rel_conf = ctx.house_conf(7);
    let venus = c.p(Graha::Venus);
    if score(venus.dignity) >= 1 {
        rel_conf.support(format!(
            "D1: Venus {}",
            phrase(venus.dignity, "well placed")
        ));
    } else if score(venus.dignity) <= -2 {
        rel_conf.against("D1: Venus debilitated");
    }
    let malefic_on_7 = c.aspects_to(7).into_iter().any(natural_malefic);
    let mut rel_body = vec![ctx.signified(7, ne)];
    if ne {
        rel_body.push(format!(
            "प्रेम र साझेदारीसँग सम्बन्धित ग्रह शुक्र {} राशिको {} भावमा छ — यहाँ {}। यसले तपाईंले नजिकको \
             सम्बन्धमा के कुरालाई महत्व दिनुहुन्छ भन्ने देखाउँछ।",
            RASHI_NE[venus.sign],
            ord_ne(venus.house),
            phrase_ne(venus.dignity, "रहेको")
        ));
        if malefic_on_7 {
            rel_body.push(
                "साझेदारी भावमाथि कठोर मानिने ग्रहको प्रभाव परेकाले सम्बन्ध केही परीक्षाबाट परिपक्व हुने सङ्केत \
                 हुन्छ — खुला सञ्चार र साझा मूल्यले बाटो सजिलो बनाउँछन्। यो एउटा प्रवृत्ति मात्र हो, निश्चित परिणाम होइन।"
                    .into(),
            );
        }
    } else {
        rel_body.push(format!(
            "Venus, the planet linked to love and partnership, is in {} (your {} house) — {} there. It \
             describes what you value and look for in closeness.",
            RASHI_EN[venus.sign],
            ord(venus.house),
            phrase(venus.dignity, "placed")
        ));
        if malefic_on_7 {
            rel_body.push(
                "A challenging influence on the partnership house suggests relationships mature through \
                 some testing — open communication and shared values smooth the path. This is a \
                 tendency, not a fixed outcome."
                    .into(),
            );
        }
    }
    sections.push(
        Section::new(
            "relationships",
            "Relationships & partnership",
            "सम्बन्ध",
            rel_body,
        )
        .conf(rel_conf),
    );

    // 9 — Family.
    let fam_conf = ctx.house_conf(4);
    let fam_body = vec![
        ctx.signified(4, ne),
        ctx.signified(9, ne),
        ctx.signified(3, ne),
        if ne {
            "४ औं भावले माता र घर, ९ औं ले पिता र ज्येष्ठ, २ औं ले वृहत् परिवार, र ३ औं ले भाइबहिनी झल्काउँछ।"
                .into()
        } else {
            "The 4th reflects mother and home, the 9th the father and elders, the 2nd the wider family, \
             and the 3rd siblings."
                .into()
        },
    ];
    sections.push(Section::new("family", "Family & home", "परिवार", fam_body).conf(fam_conf));

    // 10 — Health.
    let hp_conf = ctx.planet_conf(lagna_lord);
    let robust = score(ll.dignity) >= 1;
    let health_body = if ne {
        vec![
            "ज्योतिषमा तपाईंको जीवनशक्ति लग्न (उदाउँदो राशि), यसको स्वामी ग्रह र चन्द्रबाट हेरिन्छ; ६ औं भावले रोग, \
             निको हुने क्रम र दैनिक दिनचर्या देखाउँछ।"
                .into(),
            format!(
                "तपाईंको लग्नको स्वामी ग्रह {} ({} भावमा, यहाँ {}) {}",
                ne_name(lagna_lord),
                ord_ne(ll.house),
                phrase_ne(ll.dignity, "रहेको"),
                if robust {
                    "बलियो शरीर र छिटो निको हुनेलाई सघाउँछ।"
                } else {
                    "सक्रिय आत्म-हेरचाह खोज्छ — नियमित निद्रा, चाल र तनाव व्यवस्थापनले ठूलो फाइदा दिन्छ।"
                }
            ),
            ctx.signified(6, true),
            "यो कुण्डलीका प्रवृत्तिबाट स्वास्थ्य मार्गदर्शन हो, चिकित्सा सल्लाह होइन; कुनै समस्यामा योग्य पेशेवरसँग सल्लाह लिनुहोस्।".into(),
        ]
    } else {
        vec![
            "In Vedic astrology, your vitality is read from the rising sign, its ruling planet, and the \
             Moon; the 6th house describes illness, recovery and daily routine."
                .into(),
            format!(
                "Your rising-sign ruler {} (in your {} house, {} there) {}",
                en(lagna_lord),
                ord(ll.house),
                phrase(ll.dignity, "placed"),
                if robust {
                    "supports a robust constitution and quick recovery."
                } else {
                    "asks for proactive self-care — regular sleep, movement and stress management have outsized benefit."
                }
            ),
            ctx.signified(6, false),
            "This is wellbeing guidance from chart tendencies, not medical advice; consult a qualified \
             professional for any concern."
                .into(),
        ]
    };
    sections.push(
        Section::new(
            "health_wellbeing",
            "Health & wellbeing",
            "स्वास्थ्य",
            health_body,
        )
        .conf(hp_conf),
    );

    // 11 — Spiritual growth.
    let sp_conf = ctx.house_conf(9);
    let ketu = c.p(Graha::Ketu);
    let sp_body = if ne {
        vec![
            ctx.signified(9, true),
            ctx.signified(12, true),
            format!(
                "बृहस्पति {} भावमा भएकाले ज्ञान, नैतिकता र गुरुत्व स्वाभाविक रूपमा विकास हुने ठाउँ देखाउँछ।",
                ord_ne(jup.house)
            ),
            format!(
                "केतु {} भावमा ({}) — जहाँ तपाईंले सहज दक्षता र वैराग्यको झुकाव बोक्नुहुन्छ।",
                ord_ne(ketu.house),
                RASHI_NE[ketu.sign]
            ),
        ]
    } else {
        vec![
            ctx.signified(9, false),
            ctx.signified(12, false),
            format!(
                "Jupiter in house {} points to where wisdom, ethics and mentorship naturally develop.",
                jup.house
            ),
            format!(
                "Ketu in house {} ({}) shows where you carry instinctive mastery and a pull toward detachment.",
                ketu.house, RASHI_EN[ketu.sign]
            ),
        ]
    };
    sections.push(
        Section::new(
            "spiritual_growth",
            "Spiritual growth",
            "आध्यात्मिक विकास",
            sp_body,
        )
        .conf(sp_conf),
    );

    // 12 — Current life phase.
    let mut phase_conf = Confidence::default();
    let mut phase_body = Vec::new();
    if let Some(d) = d {
        phase_conf = ctx.planet_conf(d.maha_lord);
        let ml = c.p(d.maha_lord);
        let al = c.p(d.antar_lord);
        let owns: Vec<usize> = (1..=12).filter(|h| c.lord(*h) == d.maha_lord).collect();
        let firm_good = score(ml.dignity) >= 1 || strong_status(ml.shadbala_status.as_deref());
        if ne {
            phase_body.push(format!(
                "अहिले तपाईं {} को मुख्य जीवन-कालखण्ड (महादशा) मा हुनुहुन्छ ({} सम्म); यसभित्रको हालको \
                 उप-कालखण्ड (अन्तर्दशा) {} को हो, {} देखि {} सम्म। यो समयले {} मा जोड दिन्छ।",
                ne_name(d.maha_lord),
                date(d.maha_end, true),
                ne_name(d.antar_lord),
                date(d.antar_start, true),
                date(d.antar_end, true),
                DASHA_THEME_NE[d.maha_lord.index()]
            ));
            let owns_txt = if owns.is_empty() {
                String::new()
            } else {
                format!(
                    " र तपाईंको {} भावको स्वामी हो",
                    owns.iter()
                        .map(|h| ord_ne(*h))
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            };
            let firm = if firm_good {
                "नतिजा सजिलै आउने प्रवृत्ति हुन्छ"
            } else {
                "नतिजाले धैर्य र निरन्तर प्रयास माग्छ"
            };
            phase_body.push(format!(
                "{} तपाईंको {} भावमा छ{owns_txt}, त्यसैले अवधि {} र यसले शासन गर्ने भावमा केन्द्रित हुन्छ। यो {} छ — {firm}।",
                ne_name(d.maha_lord),
                ord_ne(ml.house),
                head(HOUSE_THEME_NE[ml.house]),
                phrase_ne(ml.dignity, "स्थित")
            ));
            if d.antar_lord != d.maha_lord {
                phase_body.push(format!(
                    "यसभित्रको {} उप-कालखण्डले {} लाई थप तिखार्छ (यो तपाईंको {} भावसँग जोडिन्छ) — {} सम्म।",
                    ne_name(d.antar_lord),
                    head(DASHA_THEME_NE[d.antar_lord.index()]),
                    ord_ne(al.house),
                    date(d.antar_end, true)
                ));
            }
        } else {
            phase_body.push(format!(
                "You're in {}'s main life period (mahadasha) until {}, and the current sub-phase within it \
                 (antardasha) belongs to {}, from {} to {}. This phase emphasises {}.",
                en(d.maha_lord),
                fmt_date(d.maha_end),
                en(d.antar_lord),
                fmt_date(d.antar_start),
                fmt_date(d.antar_end),
                DASHA_THEME[d.maha_lord.index()]
            ));
            let owns_txt = if owns.is_empty() {
                String::new()
            } else {
                format!(
                    " and rules your {} house{}",
                    owns.iter().map(|h| ord(*h)).collect::<Vec<_>>().join(", "),
                    if owns.len() > 1 { "s" } else { "" }
                )
            };
            let firm = if firm_good {
                "These results tend to arrive readily"
            } else {
                "These results reward patience and steady effort"
            };
            phase_body.push(format!(
                "{} sits in your {} house{owns_txt}, so the period concentrates on {} and the houses it \
                 rules. It is {} — {firm}.",
                en(d.maha_lord),
                ord(ml.house),
                head(HOUSE_THEME[ml.house]),
                phrase(ml.dignity, "placed")
            ));
            if d.antar_lord != d.maha_lord {
                phase_body.push(format!(
                    "Within it, the {} sub-period sharpens the theme of {} (linked to your {} house) until {}.",
                    en(d.antar_lord),
                    head(DASHA_THEME[d.antar_lord.index()]),
                    ord(al.house),
                    fmt_date(d.antar_end)
                ));
            }
        }
    } else {
        phase_body.push(if ne {
            "हालको मितिका लागि दशा समय निकाल्न सकिएन।".into()
        } else {
            "Dasha timing could not be resolved for the current date.".into()
        });
    }
    sections.push(
        Section::new(
            "current_life_phase",
            "Current life phase",
            "वर्तमान जीवन-कालखण्ड",
            phase_body,
        )
        .conf(phase_conf.clone()),
    );

    // 12b — Life journey.
    if let Some(j) = life_journey(ctx) {
        sections.push(j);
    }

    // 13 — Dasha timeline.
    if let Some(d) = d {
        let horizon = now.add_days_f64(420.0);
        let mut items = Vec::new();
        for b in &d.bhuktis {
            if b.end < now || b.start > horizon {
                continue;
            }
            let lf = c.p(b.lord);
            let running = b.start <= now && now < b.end;
            let (label, text) = if ne {
                (
                    format!(
                        "{} उप-कालखण्ड{}",
                        ne_name(b.lord),
                        if running {
                            " · अहिले चलिरहेको"
                        } else {
                            ""
                        }
                    ),
                    format!(
                        "{} → {}: {} — तपाईंको {} भावसँग जोडिन्छ।",
                        date(b.start, true),
                        date(b.end, true),
                        head(DASHA_THEME_NE[b.lord.index()]),
                        ord_ne(lf.house)
                    ),
                )
            } else {
                (
                    format!(
                        "{} sub-period{}",
                        en(b.lord),
                        if running { " · running now" } else { "" }
                    ),
                    format!(
                        "{} → {}: {} — linked to your {} house.",
                        fmt_date(b.start),
                        fmt_date(b.end),
                        head(DASHA_THEME[b.lord.index()]),
                        ord(lf.house)
                    ),
                )
            };
            items.push(item(label, ctx.planet_conf(b.lord).level(), text));
        }
        for m in &d.upcoming {
            let years = dasha::years(m.lord);
            let (label, text) = if ne {
                (
                    format!("{} जीवन-कालखण्ड (अर्को प्रमुख कालखण्ड)", ne_name(m.lord)),
                    format!(
                        "{} देखि सुरु भई {} सम्म ({years} वर्ष): {} को अध्याय।",
                        date(m.start, true),
                        date(m.end, true),
                        head(DASHA_THEME_NE[m.lord.index()])
                    ),
                )
            } else {
                (
                    format!("{} life period (next major chapter)", en(m.lord)),
                    format!(
                        "Begins {}, lasting to {} ({years} yrs): a {} chapter.",
                        fmt_date(m.start),
                        fmt_date(m.end),
                        head(DASHA_THEME[m.lord.index()])
                    ),
                )
            };
            items.push(item(label, "moderate", text));
        }
        let body = if ne {
            format!(
                "अहिले चलिरहेको {} जीवन-कालखण्डभित्रका उप-कालखण्डहरूको तालिका, अनि पछि आउने ठूला जीवन-कालखण्डहरू — \
                 तपाईंको समयको सबैभन्दा सूक्ष्म तह।",
                ne_name(d.maha_lord)
            )
        } else {
            format!(
                "The schedule of sub-periods inside your current {} life period, and the big life periods \
                 that follow — the most precise timing layer of your chart.",
                en(d.maha_lord)
            )
        };
        sections.push(
            Section::new(
                "dasha_timeline",
                "Life-period timeline (with dates)",
                "जीवन-कालखण्ड तालिका",
                vec![body],
            )
            .items(items),
        );
    }

    // 14 — 12-month outlook.
    let mut outlook = Vec::new();
    if let Some(d) = d {
        let year_end = now.add_days_f64(365.0);
        let upcoming: Vec<_> = d
            .bhuktis
            .iter()
            .filter(|b| b.start > now && b.start <= year_end)
            .collect();
        let lead = d.antar_lord;
        let lf = c.p(lead);
        let good = score(lf.dignity) >= 1 || strong_status(lf.shadbala_status.as_deref());
        if ne {
            outlook.push(format!(
                "आगामी वर्षको नेतृत्व {} को उप-कालखण्डले गर्छ ({} सम्म), {} लाई अगाडि ल्याउँदै।",
                ne_name(lead),
                date(d.antar_end, true),
                DASHA_THEME_NE[lead.index()]
            ));
            outlook.push(if good {
                format!(
                    "यो राम्रोसँग स्थित छ (तपाईंको {} भावमा), त्यसैले यसका क्षेत्रका पहल अनुकूल छन् — अगाडि बढ्ने राम्रो अवसर।",
                    ord_ne(lf.house)
                )
            } else {
                format!(
                    "यो केही दबाबमा छ (तपाईंको {} भावमा), त्यसैले प्रयासलाई गति दिनुहोस् र नतिजा जबरजस्ती नगरी तयारी गर्नुहोस्।",
                    ord_ne(lf.house)
                )
            });
            if let Some(nxt) = upcoming.first() {
                outlook.push(format!(
                    "आउने परिवर्तन: {} को उप-कालखण्ड {} मा सुरु हुन्छ, {} लाई अगाडि ल्याउँदै।",
                    ne_name(nxt.lord),
                    date(nxt.start, true),
                    head(DASHA_THEME_NE[nxt.lord.index()])
                ));
            }
        } else {
            outlook.push(format!(
                "The year ahead is led by {}'s sub-period (through {}), bringing {} to the fore.",
                en(lead),
                fmt_date(d.antar_end),
                DASHA_THEME[lead.index()]
            ));
            outlook.push(if good {
                format!(
                    "It is well placed (in your {} house), so initiatives in its areas are favoured — a good window to push forward.",
                    ord(lf.house)
                )
            } else {
                format!(
                    "It is under some pressure (in your {} house), so pace efforts and prepare rather than force outcomes in its areas.",
                    ord(lf.house)
                )
            });
            if let Some(nxt) = upcoming.first() {
                outlook.push(format!(
                    "A shift to come: the {} sub-period opens {}, bringing {} to the foreground.",
                    en(nxt.lord),
                    fmt_date(nxt.start),
                    head(DASHA_THEME[nxt.lord.index()])
                ));
            }
        }
    } else {
        outlook.push(if ne {
            "सटीक दशा-आधारित दृष्टिकोणका लागि आजको मितिको स्पष्ट तालिका आवश्यक छ।".into()
        } else {
            "A precise dasha-based outlook needs a resolvable timeline for today's date.".into()
        });
    }
    sections.push(
        Section::new(
            "outlook_12_months",
            "Outlook — next 12 months",
            "आगामी १२ महिना",
            outlook,
        )
        .conf(phase_conf),
    );

    // 14b — What to pursue & when.
    sections.push(pursue(ctx));

    // Opportunities: `TRIKONA | {11}` iterates 1, 11, 5, 9.
    let mut opp = Vec::new();
    for h in [1, 11, 5, 9] {
        let level = ctx.house_conf(h).level();
        if matches!(level, "strong" | "moderate") {
            opp.push(if ne {
                format!(
                    "{} भाव ({}) राम्रोसँग समर्थित छ — ऊर्जा लगाउने स्वाभाविक क्षेत्र।",
                    ord_ne(h),
                    head(HOUSE_THEME_NE[h])
                )
            } else {
                format!(
                    "The {} house ({}) is well supported — a natural area to invest energy.",
                    ord(h),
                    head(HOUSE_THEME[h])
                )
            });
        }
    }
    for y in ctx.yogas.iter().filter(|y| y.polarity == "benefic") {
        opp.push(if ne {
            format!("{}: {}", y.name_ne, y.text_ne)
        } else {
            format!("{}: {}", y.name, y.text)
        });
    }
    if opp.is_empty() {
        opp.push(if ne {
            "अवसर क्रमशः निर्माण हुन्छन्; आफ्नो बलियो ग्रहको क्षेत्रमा निरन्तरताले राम्रो प्रतिफल दिन्छ।".into()
        } else {
            "Opportunities are built incrementally here; consistency in your strongest planet's domain compounds well.".into()
        });
    }
    sections.push(Section::new("opportunities", "Opportunities", "अवसर", opp));

    // Cautions: `DUSTHANA` iterates 8, 12, 6.
    let mut caut = Vec::new();
    for h in [8, 12, 6] {
        let hc = ctx.house_conf(h);
        if hc.level() == "mixed" || !hc.contradicts.is_empty() {
            caut.push(if ne {
                format!(
                    "{} ({} भाव) मा स्थिर हात राख्नुहोस् — बल प्रयोग नगरी व्यवस्थापन गर्नुहोस्।",
                    head(HOUSE_THEME_NE[h]),
                    ord_ne(h)
                )
            } else {
                format!(
                    "Keep a steady hand with {} (the {} house) — manage rather than force.",
                    head(HOUSE_THEME[h]),
                    ord(h)
                )
            });
        }
    }
    for y in ctx.yogas.iter().filter(|y| y.polarity == "caution") {
        caut.push(if ne {
            format!("{}: {}", y.name_ne, y.text_ne)
        } else {
            format!("{}: {}", y.name, y.text)
        });
    }
    caut.push(if ne {
        "यीमध्ये कुनै पनि दुर्भाग्यको भविष्यवाणी होइनन् — सचेतना र संयमले प्रगति जोगाउने क्षेत्रहरू हुन्।".into()
    } else {
        "None of these are predictions of misfortune — they are areas where awareness and moderation protect your progress.".into()
    });
    sections.push(Section::new(
        "cautions",
        "Areas for caution",
        "सावधानी",
        caut,
    ));

    // 16 — Practical recommendations.
    let (strong, weak) = (ctx.strongest(), ctx.weakest());
    let rec = if ne {
        vec![
            format!("तपाईंको बलियो पक्ष — {} — मा ध्यान दिनुहोस्; यहाँ प्रगति सबैभन्दा सजिलो हुन्छ।", plain(strong, true)),
            format!(
                "कमजोर पक्ष — {} — लाई छोड्ने होइन, बरु साना नियमित बानीबाट बिस्तारै बलियो बनाउनुहोस्; पूरै तयार भएको \
                 महसुस नभएसम्म नपर्खनुहोस्।",
                plain(weak, true)
            ),
            "ठूला निर्णय माथि देखाइएका अनुकूल समयमा गर्नुहोस्, ताकि समय तपाईंको साथमा हुँदा काम अघि बढोस्।".into(),
            "तल दिइएका हरेक प्राथमिकताका लागि एउटा सानो बानी छान्नुहोस् र अर्को तीन महिना निरन्तर पछ्याउनुहोस्।".into(),
        ]
    } else {
        vec![
            format!("Play to your strengths — {}. This is where progress comes easiest for you.", plain(strong, false)),
            format!(
                "Don't avoid your weaker side — {}. Build it up slowly with small, regular habits instead \
                 of waiting until you feel ready.",
                plain(weak, false)
            ),
            "Save big decisions for the good times highlighted above, so you act when the timing is on your side.".into(),
            "Pick one small habit for each priority below and stick with it for the next three months.".into(),
        ]
    };
    sections.push(Section::new(
        "practical_recommendations",
        "Practical recommendations",
        "व्यावहारिक सुझाव",
        rec,
    ));

    // 17 — Traditional practices (optional).
    let practices = if ne {
        vec![
            "यी पारम्परिक, आस्थामा आधारित उपाय वैकल्पिक सहयोगका रूपमा दिइएका हुन् — सांस्कृतिक अभ्यास, अनिवार्यता वा ग्यारेन्टी होइन।".into(),
            format!(
                "{} का विषय बलियो बनाउन शास्त्रले यसको वारको व्रत, {} सँग सम्बन्धित दान, र त्यस क्षेत्रमा शान्त, \
                 आदरपूर्ण आचरण सुझाउँछ।",
                ne_name(weak),
                ne_name(weak)
            ),
            format!("{} का विषयमा कृतज्ञताको अभ्यासले भएको बललाई अझ राम्ररी प्रयोग गर्न सघाउँछ।", ne_name(strong)),
            "सबैभन्दा माथि, नैतिक आचरण (सदाचार) र स्थिरता हरेक परम्पराले मान्ने उपाय हुन्।".into(),
        ]
    } else {
        vec![
            "These are traditional, faith-based remedies offered as optional support — they are cultural \
             practices, not requirements or guarantees."
                .into(),
            format!(
                "For strengthening {} themes, classical texts suggest its weekday observance, charity \
                 associated with {}, and respectful, calm conduct in that life area.",
                en(weak),
                en(weak)
            ),
            format!("Gratitude practices around {} themes help you make the most of an existing strength.", en(strong)),
            "Above all, ethical action (sadachara) and steadiness are the remedies every tradition agrees on.".into(),
        ]
    };
    let mut practices = Section::new(
        "spiritual_practices",
        "Traditional spiritual practices (optional)",
        "पारम्परिक उपाय (वैकल्पिक)",
        practices,
    );
    practices.optional = true;
    sections.push(practices);

    // 18 — Planet by planet.
    let planet_items = Graha::ALL
        .into_iter()
        .map(|g| {
            let conf = ctx.planet_conf(g);
            let pf = c.p(g);
            let status = pf.shadbala_status.as_deref();
            let (label, text) = if ne {
                (
                    ne_name(g).to_owned(),
                    format!(
                        "{} यसले जीवनमा {} लाई प्रतिनिधित्व गर्छ।{}",
                        ctx.planet_line(g),
                        KARAKA_NE[g.index()],
                        status.map_or_else(String::new, |s| format!(
                            " यसको समग्र बल {} छ।",
                            status_ne(s)
                        ))
                    ),
                )
            } else {
                (
                    format!("{} ({})", en(g), ne_name(g)),
                    format!(
                        "{} In life it stands for {}.{}",
                        ctx.planet_line(g),
                        KARAKA[g.index()],
                        status.map_or_else(String::new, |s| format!(
                            " Its overall strength is {}.",
                            s.to_lowercase()
                        ))
                    ),
                )
            };
            item_factors(label, conf.level(), conf.factors(), text)
        })
        .collect();
    sections.push(
        Section::new(
            "planet_by_planet",
            "Planet by planet",
            "ग्रह विश्लेषण",
            Vec::new(),
        )
        .items(planet_items),
    );

    // 19 — House by house.
    let house_items = (1..=12)
        .map(|h| {
            let conf = ctx.house_conf(h);
            let label = if ne {
                format!(
                    "{} ({} भाव)",
                    capitalize(head(HOUSE_THEME_NE[h])),
                    ord_ne(h)
                )
            } else {
                format!("{} (house {h})", capitalize(head(HOUSE_THEME[h])))
            };
            item_factors(label, conf.level(), conf.factors(), ctx.signified(h, ne))
        })
        .collect();
    sections.push(
        Section::new("house_by_house", "House by house", "भाव विश्लेषण", Vec::new())
            .items(house_items),
    );

    // 20 — Divisional charts.
    let div_items = VARGA_DOMAIN
        .iter()
        .map(|v| divisional_item(ctx, *v))
        .collect();
    let div_body = if ne {
        "वर्ग (D) चक्रहरू जन्मकुण्डलीको हरेक राशिलाई सूक्ष्म भागमा बाँडेर बनाइन्छन्, र प्रत्येकले जीवनको एउटा निश्चित \
         क्षेत्रलाई नजिकबाट हेर्छ। तल प्रत्येक प्रमुख वर्ग चक्रले केका लागि पढिन्छ र यस कुण्डलीमा त्यो क्षेत्र कति बलियो \
         देखिन्छ भन्ने संक्षिप्त पढाइ दिइएको छ।"
    } else {
        "Divisional (varga) charts subdivide each rashi of the birth chart into finer parts, and each one \
         zooms in on a specific area of life. Below is a short reading of what every major D-chart is \
         read for and how strong that area looks in this chart."
    };
    sections.push(
        Section::new(
            "divisional_charts",
            "Divisional charts (D-charts) summary",
            "वर्ग चक्र (D-चार्ट) सारांश",
            vec![div_body.into()],
        )
        .items(div_items),
    );

    // 21 — Yogas.
    if ctx.yogas.is_empty() {
        sections.push(Section::new(
            "yoga_explanations",
            "Yogas in your chart",
            "योग",
            vec![if ne {
                "तपाईंको कुण्डलीमा छानिएका मुख्य शास्त्रीय योगमध्ये कुनै सक्रिय छैन; कुण्डली माथिका ग्रह र भाव स्थितिबाट पढिन्छ।".into()
            } else {
                "No major classical yoga from the curated set is active; the chart reads through planet and house placements above.".into()
            }],
        ));
    } else {
        let items = ctx.yogas.iter().map(|y| yoga_item(ctx, y)).collect();
        let body = if ne {
            "योग भनेको ग्रहहरूको विशेष संयोजन हो जसले जीवनमा निश्चित प्रवृत्ति ल्याउँछ। तल तपाईंको कुण्डलीमा बनेका योग, \
             तिनमा संलग्न ग्रहको बल, र हालको दशाले तिनलाई सक्रिय गरेको छ कि छैन भन्ने सहित दिइएको छ।"
        } else {
            "A yoga is a specific planetary combination that inclines the chart toward a particular \
             tendency. Below are the yogas formed in your chart, with the strength of the planets involved \
             and whether the running dasha is activating them."
        };
        sections.push(
            Section::new(
                "yoga_explanations",
                "Yogas in your chart",
                "योग",
                vec![body.into()],
            )
            .items(items),
        );
    }

    // 22 — Action plan.
    let mut plan = if ne {
        vec![
            format!(
                "१. तपाईं स्वाभाविक रूपमा राम्रो भएको कुरा — {} — मा आधार बनाउनुहोस्। यसले सबैभन्दा छिटो नतिजा दिन्छ।",
                plain(strong, true)
            ),
            format!(
                "२. कमजोर पक्ष — {} — लाई सरल साप्ताहिक दिनचर्यामा ढाल्नुहोस्, ताकि यसले तपाईंलाई रोक्न छाडोस्।",
                plain(weak, true)
            ),
        ]
    } else {
        vec![
            format!(
                "1. Build on what you're naturally good at — {}. This gives you the fastest results.",
                plain(strong, false)
            ),
            format!(
                "2. Turn your weaker side — {} — into a simple weekly routine so it stops holding you back.",
                plain(weak, false)
            ),
        ]
    };
    plan.push(match (ctx.maha(), ne) {
        (Some(m), true) => format!("३. अहिले तपाईंको जीवनमा {} लाई साथ दिने समय चलिरहेको छ — ठूला कदम यसै बेला चाल्नुहोस्।", plain(m, true)),
        (None, true) => "३. ठूला कदम माथि देखाइएका अनुकूल समयमा चाल्नुहोस्।".into(),
        (Some(m), false) => format!(
            "3. You're currently in a life phase that favours {} — use this time for your bigger moves.",
            plain(m, false)
        ),
        (None, false) => "3. Time your bigger moves for the good periods highlighted above.".into(),
    });
    if ne {
        plan.push("४. करियर र प्रतिष्ठाका लागि निरन्तर, अरूले देख्ने गरी काम गर्दै रहनुहोस्।".into());
        plan.push(
            "५. इमानदार र स्थिर दैनिक दिनचर्या कायम राख्नुहोस् — यसैले जीवनको हरेक पक्ष चुपचाप बलियो बनाउँछ।"
                .into(),
        );
    } else {
        plan.push(
            "4. For your career and reputation, keep showing up with steady, visible work.".into(),
        );
        plan.push("5. Keep an honest, steady daily routine — it's the one thing that quietly strengthens every part of your life.".into());
    }
    sections.push(Section::new(
        "action_plan",
        "Top 5 priorities",
        "मुख्य ५ प्राथमिकता",
        plan,
    ));
    let _ = (DIGNITY_PHRASE, DIGNITY_PHRASE_NE);
    sections
}
