//! The classical yoga checklist (`full_yoga_catalog` in
//! `engine/jyotish/interpretation.py`) and its API rows (`_yogas_to_api` in
//! `engine/jyotish/kundali_detail.py`).
//!
//! Every row is present or not; the text of each row comes from the generated
//! [`crate::yoga_tables`] except the `raja_<kendra lord>_<trikona lord>` rows,
//! whose set and wording depend on the chart's lords.

use serde_json::{Value, json};

use crate::{
    Graha,
    chart::{
        APOKLIMA, BENEFICS, Chart, DUAL_SIGNS, DUSTHANA, Dignity, FIXED_SIGNS, KAMA_TRIKONA,
        KENDRA, KENDRA_TRIKONA, MALEFICS, MOVABLE_SIGNS, PANAPARA, PlanetFact, TRIKONA,
        dignity_planet, house_from, natural_benefic, natural_malefic, navamsa_sign, within,
    },
    graha::SIGN_LORD,
    yoga_tables::{YogaText, yoga_text},
};

use Dignity::{Debilitated, Enemy, Exalted, Friend, Moolatrikona, Own};
use Graha::{Jupiter, Ketu, Mars, Mercury, Moon, Rahu, Saturn, Sun, Venus};

/// The seven grahas.
const SEVEN: [Graha; 7] = Graha::SEVEN;
/// `YOGA_BENEFICS`.
const YOGA_BENEFICS: [Graha; 4] = [Jupiter, Venus, Mercury, Moon];
const OEM: [Dignity; 3] = [Own, Exalted, Moolatrikona];
const OEMF: [Dignity; 4] = [Own, Exalted, Moolatrikona, Friend];
const OE: [Dignity; 2] = [Own, Exalted];
const OEF: [Dignity; 3] = [Own, Exalted, Friend];
const EDB: [Dignity; 2] = [Enemy, Debilitated];
const DRY_SIGNS: [usize; 6] = [0, 4, 7, 8, 9, 10];
const WATERY_SIGNS: [usize; 3] = [3, 7, 11];

/// One catalog row.
#[derive(Debug, Clone, PartialEq)]
pub struct YogaRow {
    /// Row key.
    pub key: String,
    /// Formed in this chart.
    pub present: bool,
    /// English name.
    pub name: String,
    /// Nepali name.
    pub name_ne: String,
    /// `benefic` / `caution` / `mixed`.
    pub polarity: &'static str,
    /// English text.
    pub text: String,
    /// Nepali text.
    pub text_ne: String,
    /// Evidence beside the verdict, for rows whose source rule is disputed
    /// (Kulavardhana).
    pub evaluation: Option<Value>,
}

/// `EXALT_DEGREE`.
const fn exalt_degree(g: Graha) -> Option<f64> {
    match g {
        Sun => Some(10.0),
        Moon => Some(3.0),
        Mars => Some(28.0),
        Mercury => Some(15.0),
        Jupiter => Some(5.0),
        Venus => Some(27.0),
        Saturn => Some(20.0),
        Rahu | Ketu => None,
    }
}

/// `_deeply_exalted`.
fn deeply_exalted(pf: &PlanetFact) -> bool {
    pf.is(Exalted) && exalt_degree(pf.key).is_some_and(|t| (pf.deg_in_sign - t).abs() <= 1.0)
}

/// `SHODASA_VARGA_DIVISIONS`.
const SHODASA: [u32; 16] = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

/// `_amsa_grade`: the named amsa for how many Shodasa vargas hold `g` in its own sign.
fn amsa_grade(g: Graha, longitude: f64) -> Option<&'static str> {
    let own = g.own_signs();
    if own.is_empty() {
        return None;
    }
    let count = SHODASA
        .iter()
        .filter(|d| own.contains(&(crate::vargas::varga_rashi(**d, longitude) - 1)))
        .count();
    match count {
        13.. => Some("vaiseshikamsa"),
        2 => Some("parijatamsa"),
        3 => Some("uttamamsa"),
        4 => Some("gopuramsa"),
        5 => Some("simhasanamsa"),
        6 => Some("parvatamsa"),
        7 => Some("devalokamsa"),
        8 => Some("kunkumamsa"),
        9 => Some("iravathamsa"),
        10 => Some("vaishnavamsa"),
        11 => Some("saivamsa"),
        12 => Some("bhaswadamsa"),
        _ => None,
    }
}

/// `_span_houses(start, length)`.
fn span(start: usize, length: usize) -> Vec<usize> {
    (0..length).map(|i| (start - 1 + i) % 12 + 1).collect()
}

/// `a <= b` on sets.
fn subset(a: &[usize], b: &[usize]) -> bool {
    a.iter().all(|x| b.contains(x))
}

/// `_sign_in_arc`.
const fn sign_in_arc(sign: usize, start: usize, end: usize) -> bool {
    if start <= end {
        start <= sign && sign <= end
    } else {
        sign >= start || sign <= end
    }
}

/// `_panchadha_relation(a, b)` (both present, `a != b`).
fn panchadha(chart: &Chart, a: Graha, b: Graha) -> Option<&'static str> {
    if a == b {
        return None;
    }
    let temporal = within(
        house_from(chart.p(b).sign, chart.p(a).sign),
        &[2, 3, 4, 10, 11, 12],
    );
    Some(if a.friends().contains(&b) {
        if temporal { "adhi_mitra" } else { "sama" }
    } else if a.enemies().contains(&b) {
        if temporal { "sama" } else { "adhi_shatru" }
    } else if temporal {
        "mitra"
    } else {
        "shatru"
    })
}

fn compound_friend(chart: &Chart, a: Graha, b: Graha) -> bool {
    matches!(panchadha(chart, a, b), Some("adhi_mitra" | "mitra"))
}

fn compound_enemy(chart: &Chart, a: Graha, b: Graha) -> bool {
    matches!(panchadha(chart, a, b), Some("shatru" | "adhi_shatru"))
}

/// `_bhava_arudha(house)`.
fn bhava_arudha(chart: &Chart, house: usize) -> usize {
    let lord_house = chart.p(chart.lord(house)).house;
    let x = (lord_house + 12 - house) % 12 + 1;
    let mut arudha = (lord_house - 1 + x - 1) % 12 + 1;
    let seventh = (house - 1 + 6) % 12 + 1;
    if arudha == house || arudha == seventh {
        arudha = (arudha - 1 + 9) % 12 + 1;
    }
    arudha
}

struct Builder {
    rows: Vec<YogaRow>,
}

#[expect(
    clippy::fn_params_excessive_bools,
    reason = "a catalog row is a key and whether it is formed"
)]
impl Builder {
    fn y(&mut self, key: &str, present: bool) {
        let (name, name_ne, polarity, text, text_ne): YogaText =
            yoga_text(key).unwrap_or(("", "", "", "", ""));
        debug_assert!(!name.is_empty(), "no text for yoga {key}");
        self.rows.push(YogaRow {
            key: key.to_owned(),
            present,
            name: name.to_owned(),
            name_ne: name_ne.to_owned(),
            polarity,
            text: text.to_owned(),
            text_ne: text_ne.to_owned(),
            evaluation: None,
        });
    }

    fn raja(&mut self, kl: Graha, tl: Graha, present: bool) {
        let mut pair = [kl.key(), tl.key()];
        pair.sort_unstable();
        let key = format!("raja_{}_{}", pair[0], pair[1]);
        let (a, b) = (
            Graha::from_key(pair[0]).unwrap_or(kl),
            Graha::from_key(pair[1]).unwrap_or(tl),
        );
        self.rows.push(YogaRow {
            key,
            present,
            name: "Raja Yoga".into(),
            name_ne: "राज योग".into(),
            polarity: "benefic",
            text: format!(
                "Formed when the angular lord ({}) and the trine lord ({}) join in one house — a \
                 Raja-yoga pattern supporting rise in status, provided the planets involved are \
                 reasonably strong.",
                kl.en(),
                tl.en()
            ),
            text_ne: format!(
                "केन्द्र स्वामी ({}) र त्रिकोण स्वामी ({}) एक भावमा मिल्दा राज योग — ग्रहहरू पर्याप्त बलियो भए \
                 उन्नति र प्रतिष्ठाका लागि शुभ।",
                a.ne(),
                b.ne()
            ),
            evaluation: None,
        });
    }
}

/// `full_yoga_catalog(chart)`: every rule, in Python's order.
#[expect(
    clippy::too_many_lines,
    clippy::similar_names,
    clippy::many_single_char_names,
    reason = "one rule per line, in the source's order, with its short chart names (P, h, hf, l2…)"
)]
#[must_use]
pub fn full_yoga_catalog(chart: &Chart) -> Vec<YogaRow> {
    let c = chart;
    let p = |g: Graha| c.p(g);
    let h = |g: Graha| c.p(g).house;
    let hf = |a: Graha, b: Graha| house_from(c.p(a).sign, c.p(b).sign);
    let asp = |g: Graha, house: usize| c.aspects(g, house);
    let lord = |house: usize| c.lord(house);
    let moon_sign = c.moon_sign;
    let sun_sign = c.sun_sign;
    let lagna_sign = c.lagna_sign;
    let hfm = |g: Graha| house_from(c.p(g).sign, moon_sign);
    let hfl = |g: Graha| house_from(c.p(g).sign, lagna_sign);
    let any_p = |f: &dyn Fn(&PlanetFact) -> bool| c.planets.iter().any(f);
    let malefic_in = |house: usize| any_p(&|pf| natural_malefic(pf.key) && pf.house == house);
    let benefic_in = |house: usize| any_p(&|pf| natural_benefic(pf.key) && pf.house == house);
    let nb_aspects = |house: usize| BENEFICS.iter().any(|b| asp(*b, house));
    let nm_aspects = |house: usize| MALEFICS.iter().any(|m| asp(*m, house));
    let nb_in = |house: usize| BENEFICS.iter().any(|b| h(*b) == house);
    let mut b = Builder {
        rows: Vec::with_capacity(330),
    };

    let lagnesh = lord(1);
    let lp = p(lagnesh);
    let flank = |reference: usize, offset: usize| -> bool {
        let target = (reference + offset - 1) % 12;
        c.planets
            .iter()
            .any(|pf| !matches!(pf.key, Sun | Moon) && pf.sign == target)
    };
    let (chandra_2, chandra_12) = (flank(moon_sign, 2), flank(moon_sign, 12));
    let (surya_2, surya_12) = (flank(sun_sign, 2), flank(sun_sign, 12));

    // ── Dosha & major patterns ──
    b.y("mangala_dosha", within(hfl(Mars), &[1, 4, 7, 8, 12]));
    let kala_sarpa = {
        let (r, k) = (p(Rahu).sign, p(Ketu).sign);
        SEVEN.iter().all(|g| sign_in_arc(p(*g).sign, r, k))
            || SEVEN.iter().all(|g| sign_in_arc(p(*g).sign, k, r))
    };
    b.y("kala_sarpa", kala_sarpa);
    let mallika = {
        let mut houses: Vec<usize> = YOGA_BENEFICS
            .iter()
            .map(|g| h(*g))
            .filter(|x| within(*x, &KENDRA))
            .collect();
        houses.sort_unstable();
        houses.dedup();
        let malefic_kendra = [Sun, Mars, Saturn].iter().any(|g| within(h(*g), &KENDRA));
        houses.len() >= 3 && !malefic_kendra
    };
    b.y("lagna_mallika", mallika);

    // ── Chandra yogas ──
    b.y("gajakesari", within(hfm(Jupiter), &KENDRA));
    b.y("sunapha", chandra_2);
    b.y("anapha", chandra_12);
    b.y("durdhara", chandra_2 && chandra_12);
    let isolated = !chandra_2 && !chandra_12;
    let kendra_occupied = KENDRA.iter().any(|x| !c.house_occupants[*x].is_empty());
    b.y("kemadruma", isolated && !kendra_occupied);
    b.y("kemadruma_bhanga", isolated && kendra_occupied);
    b.y("chandra_mangala", p(Moon).sign == p(Mars).sign);
    let moon_houses = |gs: &[Graha]| -> Vec<usize> { gs.iter().map(|g| hfm(*g)).collect() };
    b.y(
        "adhi",
        subset(&[6, 7, 8], &moon_houses(&[Mercury, Jupiter, Venus])),
    );
    b.y(
        "chatussagara",
        KENDRA.iter().all(|x| !c.house_occupants[*x].is_empty()),
    );
    // Vasumati (source #9): benefics IN the upachayas, from the Lagna (Jupiter, Venus,
    // Mercury, a waxing Moon) or from the Moon (Jupiter, Venus, Mercury). Python checks
    // the reverse and can never form it (scripts/rust_divergences.py).
    let waxing = panchanga::pyfloat::py_mod(p(Moon).longitude - p(Sun).longitude, 360.0) < 180.0;
    let upachaya = [3, 6, 10, 11];
    let from_lagna = [Jupiter, Venus, Mercury]
        .iter()
        .chain(waxing.then_some(&Moon))
        .all(|g| within(hfl(*g), &upachaya));
    let from_moon = [Jupiter, Venus, Mercury]
        .iter()
        .all(|g| within(hfm(*g), &upachaya));
    b.y("vasumati", from_lagna || from_moon);
    b.y(
        "rajalakshana",
        [Jupiter, Venus, Mercury, Moon]
            .iter()
            .all(|g| within(h(*g), &KENDRA)),
    );
    let kt_lord_houses: Vec<usize> = [1, 4, 7, 10, 5, 9].iter().map(|x| h(lord(*x))).collect();
    let vanchana = (any_p(&|pf| natural_malefic(pf.key) && pf.house == 1)
        && c.gulika_house.is_some_and(|g| within(g, &TRIKONA)))
        || c.gulika_house.is_some_and(|g| kt_lord_houses.contains(&g))
        || [Rahu, Saturn, Ketu].iter().any(|g| h(*g) == lp.house);
    b.y("vanchana_chora_bheeti", vanchana);
    b.y("shakata", within(hf(Moon, Jupiter), &[6, 8, 12]));
    b.y(
        "amala",
        [Jupiter, Venus, Mercury]
            .iter()
            .any(|g| hfl(*g) == 10 || hfm(*g) == 10),
    );
    let parvata = YOGA_BENEFICS.iter().any(|g| within(h(*g), &KENDRA))
        && c.house_occupants[6]
            .iter()
            .all(|g| YOGA_BENEFICS.contains(g))
        && c.house_occupants[8]
            .iter()
            .all(|g| YOGA_BENEFICS.contains(g));
    b.y("parvata", parvata);
    b.y(
        "kahala",
        within(hf(lord(9), lord(4)), &KENDRA) && lp.dignity_in(&OEM),
    );
    b.y("veshi", surya_2);
    b.y("vasi", surya_12);
    b.y("ubhayachari", surya_2 && surya_12);
    for (g, key) in [
        (Mars, "mahapurusha_mars"),
        (Mercury, "mahapurusha_mercury"),
        (Jupiter, "mahapurusha_jupiter"),
        (Venus, "mahapurusha_venus"),
        (Saturn, "mahapurusha_saturn"),
    ] {
        b.y(
            key,
            within(h(g), &KENDRA) && p(g).dignity_in(&[Exalted, Own, Moolatrikona]),
        );
    }
    b.y("budhaditya", p(Sun).sign == p(Mercury).sign);
    let mahabhagya = c.is_day.is_some_and(|day| {
        lagna_sign % 2 == sun_sign % 2
            && sun_sign % 2 == moon_sign % 2
            && ((day && lagna_sign % 2 == 0) || (!day && lagna_sign % 2 == 1))
    });
    b.y("mahabhagya", mahabhagya);
    b.y("pushkala", lp.sign == p(Moon).sign);
    let (l2, l3, l4, l5, l6, l7) = (lord(2), lord(3), lord(4), lord(5), lord(6), lord(7));
    let (l8, l9, l10, l11, l12) = (lord(8), lord(9), lord(10), lord(11), lord(12));
    b.y(
        "lakshmi",
        p(l9).dignity_in(&OEM) && within(h(l9), &KENDRA) && lp.dignity_in(&OEM),
    );
    let gauri = {
        let nav_lord = p(SIGN_LORD[p(l10).navamsa]);
        nav_lord.house == 10 && nav_lord.is(Exalted) && lp.house == 10
    };
    b.y("gauri", gauri);
    let bharati = [l2, l5, l11].iter().all(|l| {
        let nl = p(SIGN_LORD[p(*l).navamsa]);
        nl.is(Exalted) && nl.house == h(l9)
    });
    b.y("bharati", bharati);
    b.y("chapa", lp.is(Exalted) && h(l4) == 10 && h(l10) == 4);
    b.y(
        "chapa_nabhasa",
        SEVEN
            .iter()
            .all(|g| within(h(*g), &[10, 11, 12, 1, 2, 3, 4])),
    );
    b.y(
        "shrinatha",
        p(l7).is(Exalted) && h(l7) == 10 && h(l9) == h(l10),
    );
    b.y(
        "shankha",
        within(hf(l6, l5), &KENDRA) && lp.dignity_in(&OEM),
    );
    b.y(
        "bheri",
        [lagnesh, Jupiter, Venus]
            .iter()
            .all(|g| within(h(*g), &KENDRA))
            && p(l9).dignity_in(&OEM),
    );
    let angle_trine_own = |pf: &PlanetFact| within(pf.house, &KENDRA_TRIKONA) || pf.dignity_in(&OE);
    let parijata = {
        let d1 = p(SIGN_LORD[lp.sign]);
        let d1_nav = p(SIGN_LORD[d1.navamsa]);
        angle_trine_own(d1) || angle_trine_own(d1_nav)
    };
    b.y("parijata", parijata);
    for g in SEVEN {
        let pf = p(g);
        let present = pf.is(Debilitated) && {
            let dispositor = SIGN_LORD[pf.sign];
            let exalt_lord = g.exalt_sign().map(|s| SIGN_LORD[s]);
            within(h(dispositor), &KENDRA) || exalt_lord.is_some_and(|e| within(h(e), &KENDRA))
        };
        b.y(&format!("neechabhanga_{}", g.key()), present);
    }

    // ── Raja & Dhana ──
    let lords_sorted = |houses: &[usize]| -> Vec<Graha> {
        let mut out: Vec<Graha> = houses.iter().map(|x| lord(*x)).collect();
        out.sort_unstable_by_key(|g| g.key());
        out.dedup();
        out
    };
    let mut seen: Vec<(Graha, Graha)> = Vec::new();
    for kl in lords_sorted(&KENDRA) {
        for tl in lords_sorted(&TRIKONA) {
            if kl == tl
                || seen
                    .iter()
                    .any(|&(a, b2)| (a, b2) == (kl, tl) || (a, b2) == (tl, kl))
            {
                continue;
            }
            seen.push((kl, tl));
            b.raja(kl, tl, h(kl) == h(tl));
        }
    }
    b.y("dhana_2_11", h(l2) == h(l11));
    let mridanga = SEVEN.iter().any(|g| {
        let pf = p(*g);
        pf.is(Exalted) && {
            let nl = p(SIGN_LORD[pf.navamsa]);
            within(nl.house, &KENDRA_TRIKONA)
                && nl.dignity_in(&[Friend, Exalted, Own])
                && lp.dignity_in(&OEM)
        }
    });
    b.y("mridanga", mridanga);
    let mut occ_houses: Vec<usize> = SEVEN.iter().map(|g| h(*g)).collect();
    occ_houses.sort_unstable();
    occ_houses.dedup();
    let mut occ_signs: Vec<usize> = SEVEN.iter().map(|g| p(*g).sign).collect();
    occ_signs.sort_unstable();
    occ_signs.dedup();
    for (key, start) in [
        ("lagna_malika", 1),
        ("dhana_malika", 2),
        ("vikrama_malika", 3),
        ("sukha_malika", 4),
        ("putra_malika", 5),
        ("satru_malika", 6),
        ("kalatra_malika", 7),
        ("randhra_malika", 8),
        ("bhagya_malika", 9),
        ("karma_malika", 10),
        ("labha_malika", 11),
        ("vyaya_malika", 12),
    ] {
        b.y(key, subset(&occ_houses, &span(start, 7)));
    }
    b.y("gaja", h(l7) == 11 && h(Moon) == 11 && asp(l11, 11));
    let kalanidhi = within(h(Jupiter), &[2, 5]) && {
        let jh = h(Jupiter);
        let joins = |g: Graha| h(g) == jh || asp(g, jh);
        joins(Mercury) && joins(Venus)
    };
    b.y("kalanidhi", kalanidhi);
    b.y(
        "amsavatara",
        within(h(Venus), &KENDRA)
            && within(h(Jupiter), &KENDRA)
            && within(lagna_sign, &MOVABLE_SIGNS)
            && p(Saturn).is(Exalted)
            && within(h(Saturn), &KENDRA),
    );
    let hh1 = YOGA_BENEFICS.iter().any(|g| within(hf(*g, l2), &[8, 12]));
    let hh2 = hf(Jupiter, l7) == 4 && hf(Moon, l7) == 9 && hf(Mercury, l7) == 8;
    let hh3 = hf(Sun, lagnesh) == 4 && hf(Venus, lagnesh) == 10 && hf(Mars, lagnesh) == 11;
    b.y("harihara_brahma", hh1 || hh2 || hh3);
    b.y(
        "kusuma",
        h(Jupiter) == 1 && h(Moon) == 7 && hf(Sun, Moon) == 8,
    );
    b.y(
        "matsya",
        malefic_in(1)
            && malefic_in(9)
            && malefic_in(5)
            && benefic_in(5)
            && malefic_in(4)
            && malefic_in(8),
    );
    let kurma_navamsa = [5, 6, 7].iter().all(|x| {
        YOGA_BENEFICS.iter().any(|g| {
            let pf = p(*g);
            pf.house == *x && pf.navamsa_dignity().is_some_and(|d| OEF.contains(&d))
        })
    });
    let kurma_rasi = [1, 3, 11].iter().all(|x| {
        YOGA_BENEFICS
            .iter()
            .any(|g| p(*g).house == *x && p(*g).dignity_in(&[Own, Exalted, Friend, Moolatrikona]))
    });
    b.y("kurma", kurma_navamsa || kurma_rasi);
    b.y(
        "devendra",
        within(lagna_sign, &FIXED_SIGNS)
            && h(lagnesh) == 11
            && h(l11) == 1
            && h(l2) == 10
            && h(l10) == 2,
    );
    b.y(
        "makuta",
        hf(Jupiter, l9) == 9
            && YOGA_BENEFICS.iter().any(|g| hf(*g, Jupiter) == 9)
            && h(Saturn) == 10,
    );
    let chandika = {
        let n6 = SIGN_LORD[p(l6).navamsa];
        let n9 = SIGN_LORD[p(l9).navamsa];
        h(n6) == h(Sun) && h(n9) == h(Sun) && within(lagna_sign, &FIXED_SIGNS) && asp(l6, 1)
    };
    b.y("chandika", chandika);
    b.y("jaya", p(l6).is(Debilitated) && deeply_exalted(p(l10)));
    b.y(
        "vidyut",
        deeply_exalted(p(l11)) && h(Venus) == h(l11) && within(hf(l11, lagnesh), &KENDRA),
    );
    b.y(
        "gandharva",
        within(h(l10), &KAMA_TRIKONA)
            && h(Jupiter) == lp.house
            && p(Sun).is(Exalted)
            && h(Moon) == 9,
    );
    b.y("siva", h(l5) == 9 && h(l9) == 10 && h(l10) == 5);
    let vishnu = h(SIGN_LORD[p(l9).navamsa]) == 2 && h(l10) == 2 && h(l9) == 2;
    b.y("vishnu", vishnu);
    b.y(
        "brahma",
        within(hf(Jupiter, l9), &KENDRA)
            && within(hf(Venus, l11), &KENDRA)
            && (within(hfl(Mercury), &KENDRA) || within(hf(Mercury, l10), &KENDRA)),
    );
    b.y("indra", h(l5) == 11 && h(l11) == 5 && h(Moon) == 5);
    b.y("ravi", h(Sun) == 10 && h(l10) == 3 && h(Saturn) == 3);
    let elongation = panchanga::pyfloat::py_mod(p(Moon).longitude - p(Sun).longitude, 360.0);
    let garuda =
        c.is_day == Some(true) && p(SIGN_LORD[p(Moon).navamsa]).is(Exalted) && elongation < 180.0;
    b.y("garuda", garuda);
    b.y(
        "go",
        p(Jupiter).is(Moolatrikona) && h(l2) == h(Jupiter) && lp.is(Exalted),
    );
    let nav_lagna_sign = navamsa_sign(c.lagna_lon);
    let gola = h(Moon) == 9
        && (165.0..=195.0).contains(&elongation)
        && h(Jupiter) == 9
        && h(Venus) == 9
        && p(Mercury).navamsa == nav_lagna_sign;
    b.y("gola", gola);
    b.y(
        "thrilochana",
        within(hf(Moon, Sun), &TRIKONA) && within(hf(Mars, Sun), &TRIKONA),
    );
    // Kulavardhana (source #74) as literally worded — never formed — with the evidence
    // per reference point; no reading is chosen for it (scripts/rust_divergences.py).
    b.y(
        "kulavardhana",
        lagna_sign == sun_sign && sun_sign == moon_sign && SEVEN.iter().all(|g| h(*g) == 5),
    );
    if let Some(row) = b.rows.last_mut() {
        row.evaluation = Some(kulavardhana_evaluation(c));
    }
    let span_yogas: [(&str, Vec<usize>); 13] = [
        ("yupa", span(1, 4)),
        ("ishu", span(4, 4)),
        ("sakti", span(7, 4)),
        ("danda", span(10, 4)),
        ("nav", span(1, 7)),
        ("kuta", span(4, 7)),
        ("chhatra", span(7, 7)),
        ("chakra", vec![1, 3, 5, 7, 9, 11]),
        ("sakata_nabhasa", vec![1, 7]),
        ("vihaga", vec![4, 10]),
        ("sringhataka", TRIKONA.to_vec()),
        ("kamala", KENDRA.to_vec()),
        ("samudra_nabhasa", vec![2, 4, 6, 8, 10, 12]),
    ];
    for (key, allowed) in &span_yogas {
        b.y(key, subset(&occ_houses, allowed));
    }
    b.y(
        "ardha_chandra",
        PANAPARA
            .iter()
            .chain(&APOKLIMA)
            .any(|s| subset(&occ_houses, &span(*s, 7))),
    );
    b.y(
        "gada",
        [[1, 4], [4, 7], [7, 10], [10, 1]]
            .iter()
            .any(|pair| subset(&occ_houses, pair)),
    );
    let seven_in = |houses: &[usize], f: fn(Graha) -> bool| {
        SEVEN
            .iter()
            .filter(|g| within(h(**g), houses))
            .all(|g| f(*g))
    };
    b.y(
        "vajra",
        subset(&occ_houses, &KENDRA)
            && seven_in(&[1, 7], natural_benefic)
            && seven_in(&[4, 10], natural_malefic),
    );
    b.y(
        "yava",
        subset(&occ_houses, &KENDRA)
            && seven_in(&[1, 7], natural_malefic)
            && seven_in(&[4, 10], natural_benefic),
    );
    b.y(
        "hala",
        [[2, 6, 10], [3, 7, 11], [4, 8, 12]]
            .iter()
            .any(|t| subset(&occ_houses, t)),
    );
    b.y(
        "vapee",
        subset(&occ_houses, &PANAPARA) || subset(&occ_houses, &APOKLIMA),
    );
    for (key, n) in [
        ("vallaki", 7),
        ("damni", 6),
        ("pasa", 5),
        ("kedara", 4),
        ("sula", 3),
        ("yuga", 2),
        ("gola_nabhasa", 1),
    ] {
        b.y(key, occ_signs.len() == n);
    }
    b.y("rajju", subset(&occ_signs, &MOVABLE_SIGNS));
    b.y("musala", subset(&occ_signs, &FIXED_SIGNS));
    b.y("nala", subset(&occ_signs, &DUAL_SIGNS));

    // ── Combinations #101–162 ──
    let joined_or_aspects = |a: Graha, t: Graha| h(a) == h(t) || asp(a, h(t));
    b.y("srik_mala", BENEFICS.iter().all(|g| within(h(*g), &KENDRA)));
    b.y(
        "sarpa_101_200",
        MALEFICS.iter().all(|g| within(h(*g), &KENDRA)),
    );
    b.y("duryoga", within(h(l10), &DUSTHANA));
    b.y("daridra_101_200", within(h(l11), &DUSTHANA));
    b.y("harsha", h(l6) == 6);
    b.y("sarala", h(l8) == 8);
    b.y("vimala", h(l12) == 12);
    b.y(
        "sareera_soukhya",
        within(lp.house, &KENDRA) || within(h(Jupiter), &KENDRA) || within(h(Venus), &KENDRA),
    );
    b.y(
        "dehapushti",
        within(lp.sign, &MOVABLE_SIGNS) && nb_aspects(lp.house),
    );
    b.y(
        "dehakashta",
        lp.house == 8 || any_p(&|pf| natural_malefic(pf.key) && pf.house == lp.house),
    );
    b.y(
        "rogagrastha",
        (lp.house == 1 && [l6, l8, l12].iter().any(|l| h(*l) == 1))
            || (!lp.dignity_in(&OEMF) && within(lp.house, &KENDRA_TRIKONA)),
    );
    let dry_planet = |g: Graha| matches!(g, Sun | Mars | Saturn);
    b.y(
        "krisanga_1",
        within(lp.sign, &DRY_SIGNS) || dry_planet(SIGN_LORD[lp.sign]),
    );
    b.y(
        "krisanga_2",
        dry_planet(SIGN_LORD[nav_lagna_sign]) && malefic_in(1),
    );
    b.y(
        "dehasthoulya_1",
        within(lp.sign, &WATERY_SIGNS) && within(p(SIGN_LORD[lp.navamsa]).sign, &WATERY_SIGNS),
    );
    b.y(
        "dehasthoulya_2",
        h(Jupiter) == 1 || (within(p(Jupiter).sign, &WATERY_SIGNS) && asp(Jupiter, 1)),
    );
    b.y(
        "dehasthoulya_3",
        (within(lagna_sign, &WATERY_SIGNS) && nb_in(1)) || matches!(lagnesh, Moon | Venus),
    );
    b.y(
        "sada_sanchara",
        within(lp.sign, &MOVABLE_SIGNS) || within(p(SIGN_LORD[lp.sign]).sign, &MOVABLE_SIGNS),
    );
    let fifth_sign = (lagna_sign + 4) % 12;
    for (key, signs, planet, eleventh) in [
        ("dhana_118", &[1, 6][..], Venus, &[Saturn][..]),
        ("dhana_119", &[2, 5], Mercury, &[Moon, Mars]),
        ("dhana_120", &[9, 10], Saturn, &[Mercury, Mars]),
        ("dhana_121", &[4], Sun, &[Jupiter, Moon]),
        ("dhana_122", &[8, 11], Jupiter, &[Mars, Moon]),
    ] {
        b.y(
            key,
            within(fifth_sign, signs) && h(planet) == 5 && eleventh.iter().all(|g| h(*g) == 11),
        );
    }
    for (key, signs, planet, aspecting) in [
        ("dhana_123", &[4][..], Sun, &[Mars, Jupiter][..]),
        ("dhana_124", &[3], Moon, &[Jupiter, Mars]),
        ("dhana_125", &[0, 7], Mars, &[Moon, Venus, Saturn]),
        ("dhana_126", &[2, 5], Mercury, &[Saturn, Venus]),
        ("dhana_127", &[8, 11], Jupiter, &[Mercury, Mars]),
        ("dhana_128", &[1, 6], Venus, &[Saturn, Mercury]),
    ] {
        b.y(
            key,
            within(lagna_sign, signs)
                && h(planet) == 1
                && aspecting.iter().all(|a| joined_or_aspects(*a, planet)),
        );
    }
    b.y(
        "bahudravyarjana",
        lp.house == 2 && h(l2) == 11 && h(l11) == 1,
    );
    b.y(
        "swaveeryaddhana_1",
        within(lp.house, &KENDRA)
            && h(Jupiter) == lp.house
            && amsa_grade(l2, p(l2).longitude) == Some("vaiseshikamsa"),
    );
    let swav2 = {
        let nav_lord = SIGN_LORD[lp.navamsa];
        let fin = p(SIGN_LORD[p(nav_lord).sign]);
        fin.dignity_in(&OE) || within(house_from(fin.sign, p(l2).sign), &KENDRA_TRIKONA)
    };
    b.y("swaveeryaddhana_2", swav2);
    b.y(
        "swaveeryaddhana_3",
        within(hf(l2, lagnesh), &KENDRA_TRIKONA)
            || (natural_benefic(l2)
                && (deeply_exalted(p(l2))
                    || any_p(&|pf| pf.key != l2 && pf.house == h(l2) && pf.is(Exalted)))),
    );
    b.y(
        "madhya_vayasi_dhana",
        within(hf(l2, lagnesh), &KENDRA_TRIKONA)
            && within(hf(l2, l11), &KENDRA_TRIKONA)
            && nb_aspects(h(l2)),
    );
    let anthya = h(l2) == lp.house && {
        let has_benefic = any_p(&|pf| natural_benefic(pf.key) && pf.house == lp.house);
        let disp = p(SIGN_LORD[lp.sign]);
        has_benefic && disp.house == 1 && disp.dignity_in(&OE)
    };
    b.y("anthya_vayasi_dhana", anthya);
    b.y(
        "balya_dhana",
        h(l2) == h(l10) && within(h(l2), &KENDRA) && asp(SIGN_LORD[lp.navamsa], h(l2)),
    );
    b.y(
        "bhratrumooladdhanaprapti_1",
        lp.house == 3 && h(l2) == 3 && nb_aspects(3),
    );
    b.y(
        "bhratrumooladdhanaprapti_2",
        h(l3) == 2 && h(Jupiter) == 2 && (lp.house == 2 || asp(lagnesh, 2)),
    );
    b.y("matrumooladdhana", joined_or_aspects(l2, l4));
    let vaiseshika_lagnesh = amsa_grade(lagnesh, lp.longitude) == Some("vaiseshikamsa");
    b.y(
        "putramooladdhana",
        (h(l2) == h(l5) || h(l2) == h(Jupiter)) && vaiseshika_lagnesh,
    );
    b.y(
        "satrumooladdhana",
        (h(l2) == h(l6) || h(l2) == h(Mars)) && vaiseshika_lagnesh,
    );
    b.y(
        "kalatramooladdhana",
        (h(l2) == h(l7) || asp(l7, h(l2)))
            && (h(l2) == h(Venus) || asp(Venus, h(l2)))
            && lp.dignity_in(&OEMF),
    );
    let count_2nd = SEVEN.iter().filter(|g| h(**g) == 2).count();
    b.y(
        "amaranantha_dhana",
        count_2nd >= 3 && (p(l2).dignity_in(&OE) || p(Jupiter).dignity_in(&OE)),
    );
    b.y("ayatnadhanalabha", lp.house == 2 && h(l2) == 1);
    b.y(
        "daridra_144",
        lp.house == 12 && h(l12) == 1 && (within(h(l7), &[1, 12]) || asp(l7, 1) || asp(l7, 12)),
    );
    b.y(
        "daridra_145",
        lp.house == 6 && h(l6) == 1 && (asp(l2, h(Moon)) || asp(l7, h(Moon))),
    );
    b.y("daridra_146", h(Ketu) == 1 && h(Moon) == 1);
    b.y(
        "daridra_147",
        lp.house == 8 && ((h(l2) == 8 || asp(l2, 8)) || (h(l7) == 8 || asp(l7, 8))),
    );
    let lh = lp.house;
    b.y(
        "daridra_148",
        within(lh, &DUSTHANA)
            && any_p(&|pf| natural_malefic(pf.key) && pf.house == lh)
            && ((h(l2) == lh || asp(l2, lh)) || (h(l7) == lh || asp(l7, lh))),
    );
    b.y(
        "daridra_149",
        [l6, l8, l12].iter().any(|l| h(*l) == lh) && nm_aspects(lh),
    );
    b.y(
        "daridra_150",
        [l6, l8, l12].iter().any(|l| h(*l) == h(l5))
            && !BENEFICS.iter().any(|g| asp(*g, h(l5)) || h(*g) == h(l5)),
    );
    let daridra_151 =
        within(h(l5), &[6, 10]) && [l2, l6, l7, l8, l12].iter().any(|l| asp(*l, h(l5)));
    b.y("daridra_151", daridra_151);
    let has_152_malefic = MALEFICS
        .iter()
        .any(|g| h(*g) == 1 && *g != lord(9) && *g != l10);
    b.y(
        "daridra_152",
        has_152_malefic
            && ([l2, l7].iter().any(|m| h(*m) == 1) || [l2, l7].iter().any(|m| asp(*m, 1))),
    );
    b.y(
        "daridra_153",
        within(lh, &DUSTHANA)
            && within(h(SIGN_LORD[nav_lagna_sign]), &DUSTHANA)
            && (h(l2) == lh || asp(l2, lh))
            && (h(l7) == lh || asp(l7, lh)),
    );
    b.y(
        "yukthi_1",
        (within(h(l2), &KENDRA_TRIKONA) && nb_in(h(l2)))
            || (deeply_exalted(p(l2)) && h(Jupiter) == h(l2)),
    );
    b.y(
        "yukthi_2",
        within(h(l2), &KENDRA)
            && deeply_exalted(p(l2))
            && amsa_grade(l2, p(l2).longitude) == Some("parvatamsa")
            && (amsa_grade(Jupiter, p(Jupiter).longitude) == Some("simhasanamsa")
                || amsa_grade(Venus, p(Venus).longitude) == Some("simhasanamsa")),
    );
    let pari = SIGN_LORD[p(Sun).navamsa];
    b.y(
        "parihasaka",
        h(pari) == 2 && amsa_grade(pari, p(pari).longitude) == Some("vaiseshikamsa"),
    );
    b.y(
        "asatyavadi",
        within(p(l2).sign, &[9, 10, 0, 7])
            && any_p(&|pf| natural_malefic(pf.key) && within(pf.house, &KENDRA))
            && any_p(&|pf| natural_malefic(pf.key) && within(pf.house, &TRIKONA)),
    );
    b.y(
        "jada_101_200",
        (h(l2) == 10 && malefic_in(10)) || (h(l2) == h(Sun) && c.mandi_house == Some(h(Sun))),
    );
    b.y(
        "bhaskara",
        hf(Mercury, Sun) == 2 && hf(Moon, Mercury) == 11 && within(hf(Jupiter, Moon), &[5, 9]),
    );
    b.y(
        "marud",
        within(hf(Jupiter, Venus), &[5, 9])
            && hf(Moon, Jupiter) == 5
            && within(hf(Sun, Moon), &KENDRA),
    );
    let sar = [1, 2, 4, 5, 7, 9, 10];
    b.y(
        "saraswathi",
        within(h(Jupiter), &sar)
            && p(Jupiter).dignity_in(&OEMF)
            && within(h(Venus), &sar)
            && within(h(Mercury), &sar),
    );
    b.y(
        "budha_yoga",
        h(Jupiter) == 1
            && within(h(Moon), &KENDRA)
            && hf(Rahu, Moon) == 2
            && hf(Sun, Rahu) == 3
            && hf(Mars, Rahu) == 3,
    );
    let hemmed = |pf: &PlanetFact| {
        let h2 = pf.house % 12 + 1;
        let h12 = (pf.house + 10) % 12 + 1;
        malefic_in(h2) && malefic_in(h12)
    };
    let waning = elongation >= 180.0;
    let weak = |pf: &PlanetFact| pf.dignity_in(&EDB);
    let linked = |a: Graha, others: &[Graha]| others.iter().any(|o| h(a) == h(*o) || asp(*o, h(a)));
    let has_digbala = |g: Graha| p(g).dig_bala.is_some_and(|d| d > 30.0);
    let eighth_sign = (lagna_sign + 7) % 12;
    let third_sign = (lagna_sign + 2) % 12;
    let mooka =
        h(l2) == 8 && h(Jupiter) == 8 && !(eighth_sign == 3 || within(eighth_sign, &[8, 11]));
    b.y("mooka", mooka);
    let navd = |g: Graha| p(g).navamsa_dignity();
    let navd_in = |g: Graha, set: &[Dignity]| navd(g).is_some_and(|d| set.contains(&d));
    b.y(
        "netranasa",
        (h(l10) == 1 && h(l6) == 1 && h(l2) == 1)
            || (navd(l10) == Some(Debilitated) && navd(l6) == Some(Debilitated)),
    );
    b.y(
        "andha_163",
        (h(Mercury) == 2 && h(Moon) == 2) || (lp.house == 2 && h(l2) == 2 && h(Sun) == 2),
    );
    b.y("sumukha_1", within(h(l2), &KENDRA) && nb_aspects(h(l2)));
    b.y("sumukha_2", nb_in(2));
    b.y(
        "durmukha_1",
        malefic_in(2) && (p(l2).is(Debilitated) || malefic_in(h(l2))),
    );
    b.y(
        "durmukha_2",
        natural_malefic(l2)
            && (c.gulika_house == Some(h(l2))
                || (navd_in(l2, &EDB)
                    && any_p(&|pf| {
                        pf.key != l2 && natural_malefic(pf.key) && pf.navamsa == p(l2).navamsa
                    }))),
    );
    let vaiseshika_l2 = amsa_grade(l2, p(l2).longitude) == Some("vaiseshikamsa");
    b.y(
        "bhojana_soukhya",
        vaiseshika_l2 && (asp(Jupiter, h(l2)) || asp(Venus, h(l2))),
    );
    b.y(
        "annadana",
        vaiseshika_l2
            && (h(l2) == h(Jupiter) || asp(Jupiter, h(l2)))
            && (h(l2) == h(Mercury) || asp(Mercury, h(l2))),
    );
    b.y(
        "parannabhojana",
        (p(l2).is(Debilitated) || navd(l2) == Some(Enemy))
            && any_p(&|pf| dignity_planet(pf.key) && pf.is(Debilitated) && asp(pf.key, h(l2))),
    );
    b.y(
        "sraddhannabhuktha",
        l2 == Saturn || h(l2) == h(Saturn) || (p(Saturn).is(Debilitated) && asp(Saturn, 2)),
    );
    b.y("sarpaganda_163", h(Rahu) == 2 && c.mandi_house == Some(2));
    b.y(
        "vakchalana",
        natural_malefic(l2) && navd_in(l2, &EDB) && !nb_in(h(l2)) && !nb_aspects(h(l2)),
    );
    b.y(
        "vishaprayoga",
        malefic_in(2) && nm_aspects(2) && navd_in(l2, &EDB) && nm_aspects(h(l2)),
    );
    b.y(
        "bhratruvriddhi",
        (nb_in(h(l3)) || nb_aspects(h(l3))) || (nb_in(h(Mars)) || nb_aspects(h(Mars))) || nb_in(3),
    );
    b.y(
        "sodaranasa",
        h(Mars) == h(l3) && within(h(Mars), &[3, 5, 7, 8]) && nm_aspects(h(Mars)),
    );
    b.y(
        "ekabhagini",
        h(Mercury) == 3 && h(l3) == h(Moon) && h(Mars) == h(Saturn),
    );
    b.y(
        "dwadasa_sahodara",
        within(h(l3), &KENDRA)
            && p(Mars).is(Exalted)
            && h(Mars) == h(Jupiter)
            && within(hf(Mars, l3), &TRIKONA),
    );
    b.y(
        "sapthasankhya_sahodara",
        h(l12) == h(Mars) && h(Moon) == 3 && h(Jupiter) == 3 && !(h(Venus) == 3 || asp(Venus, 3)),
    );
    b.y(
        "parakrama",
        navd_in(l3, &OEF)
            && (nb_in(h(l3)) || nb_aspects(h(l3)))
            && natural_benefic(SIGN_LORD[p(Mars).sign]),
    );
    let yuddha_praveena = {
        let ynl = SIGN_LORD[p(l3).navamsa];
        let ynl2 = SIGN_LORD[p(ynl).navamsa];
        p(ynl2).dignity_in(&OE)
    };
    b.y("yuddha_praveena", yuddha_praveena);
    b.y(
        "yuddhatpoorvadridhachitta",
        p(l3).is(Exalted)
            && (within(p(l3).sign, &MOVABLE_SIGNS) || within(p(l3).navamsa, &MOVABLE_SIGNS))
            && malefic_in(h(l3)),
    );
    b.y(
        "yuddhatpaschaddrudha",
        within(p(l3).sign, &FIXED_SIGNS)
            && within(p(l3).navamsa, &FIXED_SIGNS)
            && p(SIGN_LORD[p(l3).sign]).is(Debilitated),
    );
    b.y(
        "satkathadisravana",
        natural_benefic(SIGN_LORD[third_sign]) && nb_aspects(3) && navd_in(l3, &OEF),
    );
    b.y(
        "uttama_griha",
        within(h(l4), &KENDRA_TRIKONA) && nb_in(h(l4)),
    );
    b.y(
        "vichitra_saudha_prakara",
        h(l4) == h(l10) && h(l10) == h(Saturn) && h(Saturn) == h(Mars),
    );
    b.y(
        "ayatna_griha_prapta_1",
        within(lp.house, &[1, 4])
            && within(h(l7), &[1, 4])
            && (nb_aspects(lp.house) || nb_aspects(h(l7))),
    );
    b.y(
        "ayatna_griha_prapta_2",
        within(h(l9), &KENDRA) && p(l4).dignity_in(&[Exalted, Moolatrikona, Own]),
    );
    b.y("grihanasa_1", h(l4) == 12 && nm_aspects(12));
    b.y("grihanasa_2", h(SIGN_LORD[p(l4).navamsa]) == 12);
    b.y(
        "bandhu_pujya_1",
        natural_benefic(l4)
            && BENEFICS.iter().any(|g| *g != l4 && asp(*g, h(l4)))
            && h(Mercury) == 1,
    );
    b.y(
        "bandhu_pujya_2",
        h(Jupiter) == 4 || asp(Jupiter, 4) || h(l4) == h(Jupiter),
    );
    b.y(
        "bandhubhisthyaktha",
        malefic_in(h(l4)) || p(l4).dignity_in(&EDB),
    );
    b.y(
        "matrudeerghayur_1",
        nb_in(4) && p(l4).is(Exalted) && p(Moon).dignity_in(&OEMF),
    );
    let matrudeerghayur_2 = {
        let mnl = p(SIGN_LORD[p(l4).navamsa]);
        mnl.dignity_in(&OEMF)
            && within(mnl.house, &KENDRA)
            && within(house_from(mnl.sign, moon_sign), &KENDRA)
    };
    b.y("matrudeerghayur_2", matrudeerghayur_2);
    b.y(
        "matrunasa_1",
        malefic_in(h(Moon)) || nm_aspects(h(Moon)) || hemmed(p(Moon)),
    );
    let matrunasa_2 = {
        let m2 = SIGN_LORD[p(l4).navamsa];
        let m3 = SIGN_LORD[p(m2).navamsa];
        within(h(m3), &DUSTHANA)
    };
    b.y("matrunasa_2", matrunasa_2);
    let afflicted_kendra =
        |g: Graha| within(h(g), &KENDRA) && (malefic_in(h(g)) || nm_aspects(h(g)));
    b.y(
        "matrugami",
        (afflicted_kendra(Moon) || afflicted_kendra(Venus)) && malefic_in(4),
    );
    let fifth_ref = (lagna_sign + 4) % 12;
    let fourth_ref = (lagna_sign + 3) % 12;
    let malefic_on = |house: usize| {
        any_p(&|pf| natural_malefic(pf.key) && (pf.house == house || asp(pf.key, house)))
    };
    b.y(
        "sahodareesangama",
        h(l7) == 4 && h(Venus) == 4 && malefic_on(4),
    );
    b.y("kapata_1", malefic_in(4) && malefic_on(h(l4)));
    b.y(
        "kapata_2",
        [Saturn, Mars, Rahu].iter().all(|g| h(*g) == 4)
            && natural_malefic(l10)
            && nm_aspects(h(l10)),
    );
    b.y(
        "kapata_3",
        h(l4) == h(Saturn)
            && h(Saturn) == h(Rahu)
            && c.mandi_house == Some(h(Rahu))
            && nm_aspects(h(l4)),
    );
    b.y(
        "nishkapata_1",
        benefic_in(4)
            || any_p(&|pf| dignity_planet(pf.key) && pf.house == 4 && pf.dignity_in(&OEF))
            || natural_benefic(SIGN_LORD[fourth_ref]),
    );
    b.y(
        "nishkapata_2",
        lp.house == 4 && BENEFICS.iter().any(|g| h(*g) == 4 || asp(*g, 4)),
    );
    b.y(
        "matru_satrutwa",
        lagnesh.enemies().contains(&l4)
            || l4.enemies().contains(&lagnesh)
            || compound_enemy(c, lagnesh, l4)
            || compound_enemy(c, l4, lagnesh),
    );
    b.y(
        "matru_sneha",
        lagnesh == l4
            || lagnesh.friends().contains(&l4)
            || l4.friends().contains(&lagnesh)
            || compound_friend(c, lagnesh, l4)
            || compound_friend(c, l4, lagnesh)
            || nb_aspects(h(l4)),
    );
    b.y("vahana_1", within(lp.house, &[4, 9, 11]));
    let vahana_2 = p(l4).is(Exalted)
        && l4
            .exalt_sign()
            .is_some_and(|s| within(h(SIGN_LORD[s]), &KENDRA_TRIKONA));
    b.y("vahana_2", vahana_2);
    b.y(
        "anapathya",
        weak(p(Jupiter)) && weak(lp) && weak(p(l7)) && weak(p(l5)),
    );
    b.y(
        "sarpasapa_1",
        h(Rahu) == 5 && (asp(Mars, 5) || within(fifth_ref, &[0, 7])),
    );
    b.y(
        "sarpasapa_2",
        h(l5) == h(Rahu) && h(Saturn) == 5 && (h(Moon) == 5 || asp(Moon, 5)),
    );
    b.y(
        "sarpasapa_3",
        h(Jupiter) == h(Mars) && h(Rahu) == 1 && within(h(l5), &DUSTHANA),
    );
    b.y(
        "sarpasapa_4",
        within(fifth_ref, &[0, 7]) && h(Rahu) == 5 && (h(Mercury) == 5 || asp(Mercury, 5)),
    );
    b.y(
        "pitrusapa_sutakshaya",
        h(Sun) == 5 && (fifth_ref == 6 || within(fifth_ref, &[9, 10]) || hemmed(p(Sun))),
    );
    b.y(
        "matrusapa_sutakshaya",
        h(l8) == 5 && h(l5) == 8 && h(Moon) == 6 && h(l4) == 6,
    );
    b.y(
        "bhratrusapa_sutakshaya",
        lp.house == 8 && h(l5) == 8 && h(l3) == h(Mars) && h(Mars) == h(Rahu) && h(Rahu) == 5,
    );
    b.y(
        "pretasapa",
        h(Sun) == 5
            && h(Saturn) == 5
            && h(Moon) == 7
            && p(Moon).dignity_in(&EDB)
            && h(Rahu) == 1
            && h(Jupiter) == 12,
    );
    b.y(
        "bahuputra_1",
        h(Rahu) == 5 && SIGN_LORD[p(Rahu).navamsa] != Saturn,
    );
    let bahuputra_2 = c.planets.iter().any(|pf| {
        pf.key != l7
            && (pf.house == h(l7) || asp(pf.key, h(l7)))
            && within(h(SIGN_LORD[pf.navamsa]), &[1, 2, 5])
    });
    b.y("bahuputra_2", bahuputra_2);
    b.y(
        "dattaputra_1",
        h(Mars) == 5
            && h(Saturn) == 5
            && within(lp.sign, &[2, 5])
            && (h(Mercury) == lp.house || asp(Mercury, lp.house)),
    );
    b.y(
        "dattaputra_2",
        h(l7) == 11 && nb_in(h(l5)) && [Mars, Saturn].iter().any(|g| h(*g) == 5),
    );
    b.y("aputra", within(h(l5), &DUSTHANA));
    b.y("ekaputra", within(h(l5), &KENDRA_TRIKONA));
    b.y(
        "satputra",
        l5 == Jupiter && p(Sun).dignity_in(&[Own, Exalted, Friend, Moolatrikona]),
    );
    b.y("kalanirdesat_putra_1", h(Jupiter) == 5 && h(l5) == h(Venus));
    b.y(
        "kalanirdesat_putra_2",
        hfl(Jupiter) == 9 && hf(Venus, Jupiter) == 9 && h(Venus) == lp.house,
    );
    b.y(
        "kalanirdesat_putranasa_1",
        h(Rahu) == 5 && malefic_in(h(l5)) && p(Jupiter).is(Debilitated),
    );
    b.y(
        "kalanirdesat_putranasa_2",
        any_p(&|pf| natural_malefic(pf.key) && house_from(pf.sign, p(Jupiter).sign) == 5)
            && any_p(&|pf| natural_malefic(pf.key) && house_from(pf.sign, lagna_sign) == 5),
    );
    b.y(
        "buddhimaturya",
        natural_benefic(l5)
            && (BENEFICS.iter().any(|g| *g != l5 && asp(*g, h(l5)))
                || natural_benefic(SIGN_LORD[p(l5).sign])),
    );
    let theevrabuddhi = natural_benefic(l5) && nb_aspects(h(SIGN_LORD[p(l5).navamsa]));
    b.y("theevrabuddhi", theevrabuddhi);
    b.y(
        "buddhi_jada",
        malefic_on(lp.house) && h(Saturn) == 5 && asp(Saturn, lp.house),
    );
    b.y(
        "thrikalagnana",
        (p(Jupiter).vargottama || navd_in(Jupiter, &OE)) && nb_aspects(h(Jupiter)),
    );
    b.y(
        "putra_sukha",
        nb_in(5) || (p(l5).dignity_in(&OEMF) && nb_aspects(h(l5))),
    );
    b.y("jara", h(l7) == 4 && h(l4) == 7 && nm_aspects(4));
    b.y("jarajaputra", h(l5) == h(Venus) && h(Moon) == 5);
    b.y("bahu_stree", p(l7).dignity_in(&OE) && h(Venus) == h(l7));
    b.y(
        "satkalatra",
        linked(l7, &[Jupiter, Mercury]) || linked(Venus, &[Jupiter, Mercury]),
    );
    b.y(
        "bhaga_chumbana",
        (h(l7) == 4 && h(Venus) == 4)
            || (lp.is(Debilitated) || lp.navamsa_dignity() == Some(Debilitated)),
    );
    b.y(
        "bhagya",
        BENEFICS
            .iter()
            .any(|g| within(h(*g), &[1, 3, 5]) && p(*g).dignity_in(&OEMF) && asp(*g, 9)),
    );
    b.y(
        "jananatpurvam_pitru_marana",
        within(h(Sun), &DUSTHANA) && h(l8) == 9 && h(l12) == 1 && h(l6) == 5,
    );
    b.y(
        "dhatrutwa",
        p(l9).is(Exalted) && nb_aspects(h(l9)) && nb_in(9),
    );
    b.y(
        "apakeerti",
        h(Sun) == 10 && h(Saturn) == 10 && nm_aspects(10),
    );
    let raja1 = SEVEN
        .iter()
        .filter(|g| within(h(**g), &KENDRA) && p(**g).dignity_in(&OE))
        .count();
    b.y("raja_1_201_300", raja1 >= 3);
    b.y(
        "raja_2_201_300",
        SEVEN.iter().any(|g| {
            let pf = p(*g);
            pf.is(Debilitated)
                && within(pf.house, &KENDRA_TRIKONA)
                && (!pf.combust || pf.retrograde)
        }),
    );
    let raja3 = SEVEN.iter().filter(|g| has_digbala(**g)).count();
    b.y("raja_3_201_300", (2..=4).contains(&raja3));
    b.y(
        "neechabhanga_raja_1",
        lagna_sign == 10
            && h(Venus) == 1
            && SEVEN.iter().filter(|g| p(**g).is(Exalted)).count() >= 4,
    );
    b.y(
        "neechabhanga_raja_2",
        h(Moon) == 1 && h(Jupiter) == 4 && h(Venus) == 10 && p(Saturn).dignity_in(&[Exalted, Own]),
    );
    let nb_generic = |g: Graha| {
        let pf = p(g);
        pf.is(Debilitated) && {
            let kendra_either = |x: Graha| {
                within(house_from(p(x).sign, lagna_sign), &KENDRA)
                    || within(house_from(p(x).sign, moon_sign), &KENDRA)
            };
            kendra_either(SIGN_LORD[pf.sign])
                || g.exalt_sign().is_some_and(|s| kendra_either(SIGN_LORD[s]))
        }
    };
    b.y("neechabhanga_raja_3", SEVEN.iter().any(|g| nb_generic(*g)));
    b.y(
        "raja_4_201_300",
        h(Moon) == 4 && h(Jupiter) == 12 && asp(Jupiter, 4) && h(Mars) == 10 && asp(Mars, 4),
    );
    let debilitated: Vec<Graha> = SEVEN
        .iter()
        .copied()
        .filter(|g| p(*g).is(Debilitated))
        .collect();
    b.y(
        "raja_5_201_300",
        !debilitated.is_empty() && debilitated.iter().all(|g| navd(*g) == Some(Exalted)),
    );
    b.y(
        "raja_6_201_300",
        h(Jupiter) == 1 && h(Mercury) == 10 && lp.house == 10 && h(Mars) == 10,
    );
    b.y(
        "raja_7_201_300",
        p(Saturn).dignity_in(&[Exalted, Moolatrikona])
            && within(h(Saturn), &KENDRA_TRIKONA)
            && asp(l10, h(Saturn)),
    );
    b.y(
        "raja_8_201_300",
        within(h(Moon), &[2, 3]) && h(Mars) == h(Moon) && h(Rahu) == 5,
    );
    b.y("raja_9_201_300", h(l10) == 9 && navd_in(l10, &OEF));
    b.y(
        "raja_10_201_300",
        h(Jupiter) == 5
            && within(hfm(Jupiter), &KENDRA)
            && within(lagna_sign, &FIXED_SIGNS)
            && lp.house == 10,
    );
    let raja_11 = {
        let nl = p(SIGN_LORD[p(Moon).navamsa]);
        within(nl.house, &KENDRA_TRIKONA)
            || within(house_from(nl.sign, p(Mercury).sign), &KENDRA_TRIKONA)
    };
    b.y("raja_11_201_300", raja_11);
    b.y(
        "sarpaganda_2",
        h(Rahu) == 2 && c.mandi_house == Some(2) && nm_aspects(h(l2)),
    );
    let raja_12 = within(lagna_sign, &MOVABLE_SIGNS)
        && within(lp.sign, &MOVABLE_SIGNS)
        && SEVEN
            .iter()
            .any(|g| p(*g).is(Debilitated) && within(h(SIGN_LORD[p(*g).navamsa]), &KENDRA_TRIKONA));
    b.y("raja_12_201_300", raja_12);
    b.y(
        "raja_13_201_300",
        any_p(&|pf| {
            dignity_planet(pf.key)
                && pf.key != lagnesh
                && pf.house == lp.house
                && pf.is(Debilitated)
        }) && h(Rahu) == 10
            && h(Saturn) == 10
            && asp(l9, 10),
    );
    let raja_14 = [l11, l9, l2].iter().any(|l| within(hfm(*l), &KENDRA))
        && (l2 == Jupiter || l5 == Jupiter || l11 == Jupiter);
    b.y("raja_14_201_300", raja_14);
    let raja_15 = [Jupiter, Mercury, Venus, Moon].iter().any(|k| {
        let pf = p(*k);
        pf.house == 9
            && !pf.combust
            && SEVEN
                .iter()
                .any(|fr| fr != k && (h(*fr) == 9 || asp(*fr, 9)) && compound_friend(c, *k, *fr))
    });
    b.y("raja_15_201_300", raja_15);
    b.y("galakarna", h(Rahu) == 3 && c.mandi_house == Some(3));
    b.y("vrana", natural_malefic(l6) && within(h(l6), &[1, 8, 10]));
    b.y("sisnavyadhi", h(Mercury) == 1 && h(l6) == 1 && h(l8) == 1);
    b.y("kalatrashanda", h(l7) == 6 && h(Venus) == 6);
    b.y(
        "kushtaroga_1",
        within(lp.house, &[4, 12]) && h(Mars) == lp.house && h(Mercury) == lp.house,
    );
    b.y(
        "kushtaroga_2",
        h(Jupiter) == 6 && h(Saturn) == 6 && h(Moon) == 6,
    );
    b.y(
        "kshayaroga",
        h(Rahu) == 6 && c.mandi_house.is_some_and(|m| within(m, &KENDRA)) && lp.house == 8,
    );
    b.y(
        "bandhana",
        h(l6) == lp.house
            && within(lp.house, &KENDRA_TRIKONA)
            && [Saturn, Rahu, Ketu].iter().any(|g| h(*g) == lp.house),
    );
    b.y(
        "karascheda",
        (h(Saturn) == 9 && h(Jupiter) == 3) || (h(Saturn) == 3 && h(Jupiter) == 9),
    );
    b.y(
        "sirachcheda",
        h(l6) == h(Venus) && (h(Sun) == h(Rahu) || h(Saturn) == h(Rahu)),
    );
    b.y(
        "durmarana",
        within(h(Moon), &DUSTHANA)
            && asp(lagnesh, h(Moon))
            && ([Saturn, Rahu].iter().any(|g| h(*g) == h(Moon)) || c.mandi_house == Some(h(Moon))),
    );
    b.y(
        "yuddhe_marana",
        (l6 == Mars || l8 == Mars)
            && h(l3) == h(Mars)
            && ([Rahu, Saturn].iter().any(|g| h(*g) == h(Mars)) || c.mandi_house == Some(h(Mars))),
    );
    let evil_8 = MALEFICS.iter().filter(|g| h(**g) == 8).count();
    b.y(
        "sanghataka_marana_1",
        evil_8 >= 2
            && MALEFICS.iter().any(|g| {
                h(*g) == 8 && (within(p(*g).sign, &[0, 7]) || within(p(*g).navamsa, &[0, 7]))
            }),
    );
    b.y(
        "sanghataka_marana_2",
        [Sun, Rahu, Saturn].iter().all(|g| asp(l8, h(*g))),
    );
    b.y(
        "peenasaroga",
        h(Moon) == 6
            && h(Saturn) == 8
            && any_p(&|pf| natural_malefic(pf.key) && pf.key != Moon && pf.house == 12)
            && natural_malefic(SIGN_LORD[lp.navamsa]),
    );
    b.y(
        "pittaroga",
        malefic_in(6)
            && any_p(&|pf| natural_malefic(pf.key) && pf.key != Sun && pf.house == h(Sun))
            && nm_aspects(h(Sun)),
    );
    b.y(
        "vikalangapatni",
        within(h(Venus), &[5, 7, 9]) && h(Sun) == h(Venus),
    );
    b.y(
        "putrakalatraheena",
        h(Moon) == 5 && waning && malefic_in(12) && malefic_in(7) && malefic_in(1),
    );
    b.y(
        "bharyasahavyabhichara",
        h(Moon) == 7 && [Venus, Saturn, Mars].iter().all(|g| h(*g) == 7),
    );
    b.y(
        "vamsacheda",
        h(Moon) == 10 && h(Venus) == 7 && malefic_in(4),
    );
    b.y(
        "guhyaroga",
        within(p(Moon).navamsa, &[3, 7])
            && any_p(&|pf| {
                pf.key != Moon && natural_malefic(pf.key) && pf.navamsa == p(Moon).navamsa
            }),
    );
    b.y(
        "angaheena",
        h(Moon) == 10 && h(Mars) == 7 && hf(Saturn, Sun) == 2,
    );
    b.y(
        "swetakushta",
        ((h(Mars) == 2 && h(Saturn) == 12) || (h(Mars) == 12 && h(Saturn) == 2))
            && h(Moon) == 1
            && h(Sun) == 7,
    );
    let malefic_trikona = any_p(&|pf| natural_malefic(pf.key) && within(pf.house, &TRIKONA));
    b.y(
        "pisacha_grastha",
        h(Rahu) == 1 && h(Moon) == 1 && malefic_trikona,
    );
    b.y("andha_1", h(Sun) == 1 && h(Rahu) == 1 && malefic_trikona);
    b.y(
        "andha_2",
        h(Mars) == 2 && h(Moon) == 6 && h(Saturn) == 12 && h(Sun) == 8,
    );
    b.y("vatharoga", h(Jupiter) == 1 && h(Saturn) == 7);
    b.y("matibhramana_1", h(Jupiter) == 1 && h(Mars) == 7);
    b.y(
        "matibhramana_2",
        h(Saturn) == 1 && within(h(Mars), &[5, 7, 9]),
    );
    b.y("matibhramana_3", h(Saturn) == 12 && h(Moon) == 12 && waning);
    b.y(
        "matibhramana_4",
        within(h(Moon), &KENDRA)
            && h(Mercury) == h(Moon)
            && any_p(&|pf| {
                !matches!(pf.key, Moon | Mercury) && (pf.house == h(Moon) || asp(pf.key, h(Moon)))
            }),
    );
    b.y(
        "khalawata",
        natural_malefic(SIGN_LORD[lagna_sign]) && nm_aspects(1),
    );
    b.y("nishturabhashi", h(Moon) == h(Saturn));
    let rajabhrashta = {
        let al = bhava_arudha(c, 1);
        let a12 = bhava_arudha(c, 12);
        let al_lord = SIGN_LORD[(lagna_sign + al - 1) % 12];
        let a12_lord = SIGN_LORD[(lagna_sign + a12 - 1) % 12];
        h(al_lord) == h(a12_lord)
    };
    b.y("rajabhrashta", rajabhrashta);
    b.y(
        "raja_yoga_bhanga_1",
        lagna_sign == 4
            && p(Saturn).sign == 6
            && p(Saturn).is(Exalted)
            && navd(Saturn) == Some(Debilitated),
    );
    b.y(
        "raja_yoga_bhanga_2",
        p(Sun).sign == 6 && (p(Sun).deg_in_sign - 10.0).abs() <= 1.0,
    );
    b.y(
        "gohanta",
        any_p(&|pf| natural_malefic(pf.key) && within(pf.house, &KENDRA) && !nb_aspects(pf.house))
            && h(Jupiter) == 8,
    );
    b.rows
}

/// The 5th from the Lagna, the Sun and the Moon: which of the seven grahas, and
/// which benefics, occupy each (`kulavardhana_evaluation`).
fn kulavardhana_evaluation(c: &Chart) -> Value {
    let waxing =
        panchanga::pyfloat::py_mod(c.p(Moon).longitude - c.p(Sun).longitude, 360.0) < 180.0;
    let benefic = |g: Graha| matches!(g, Jupiter | Venus | Mercury) || (g == Moon && waxing);
    let mut refs = serde_json::Map::new();
    for (name, sign) in [
        ("lagna", c.lagna_sign),
        ("sun", c.sun_sign),
        ("moon", c.moon_sign),
    ] {
        let fifth = (sign + 4) % 12;
        let planets: Vec<Graha> = SEVEN
            .iter()
            .copied()
            .filter(|g| c.p(*g).sign == fifth)
            .collect();
        refs.insert(
            name.into(),
            json!({
                "fifth_house_sign": fifth + 1,
                "planets": planets.iter().map(|g| g.key()).collect::<Vec<_>>(),
                "benefics": planets.iter().filter(|g| benefic(**g)).map(|g| g.key()).collect::<Vec<_>>(),
            }),
        );
    }
    json!({
        "source": "B.V. Raman, Three Hundred Important Combinations",
        "combination": 74,
        "definition": "All planets in 5th from Lagna, Sun, and Moon.",
        "benefic_rule": "Jupiter, Venus, Mercury; the Moon when waxing (0–180° ahead of the Sun)",
        "reference_evaluations": refs,
        "literal_interpretation": "requires_source_verification",
        "verification_status": "interpretation_pending",
    })
}

/// `_yoga_nature`.
const fn nature(polarity: &str) -> &'static str {
    match polarity.as_bytes() {
        b"benefic" => "auspicious",
        b"mixed" => "mixed",
        b"caution" => "caution",
        _ => "inauspicious",
    }
}

/// `_yogas_to_api(full_yoga_catalog(chart))`.
#[must_use]
pub fn yogas_api(rows: &[YogaRow]) -> Value {
    Value::Array(
        rows.iter()
            .map(|y| {
                let mut row = json!({
                    "key": y.key,
                    "nameEn": y.name,
                    "nameNe": y.name_ne,
                    "nature": nature(y.polarity),
                    "present": y.present,
                    "descEn": y.text,
                    "descNe": y.text_ne,
                });
                if let (Some(e), Value::Object(m)) = (&y.evaluation, &mut row) {
                    m.insert("evaluation".into(), e.clone());
                }
                row
            })
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        chart::{ChartInputs, RawPlanet, ShadbalaFacts, build_chart},
        yoga_tables::STATIC_ORDER,
    };

    #[test]
    fn rows_follow_python_order() {
        let planets: [RawPlanet; 9] = std::array::from_fn(|i| RawPlanet {
            longitude: (f64::from(u8::try_from(i).unwrap_or(0)) * 37.3) % 360.0,
            retrograde: false,
        });
        let sb: [ShadbalaFacts; 9] = Default::default();
        let chart = build_chart(
            &planets,
            &ChartInputs {
                lagna_lon: 12.0,
                shadbala: &sb,
                timeline: None,
                now: timescale::UtcInstant::from_utc(
                    timescale::CivilDay::new(2000, 1, 1),
                    0,
                    0,
                    0,
                    0,
                )
                .expect("instant"),
                is_day: Some(true),
                gulika_lon: None,
                mandi_lon: None,
            },
        );
        let keys: Vec<String> = full_yoga_catalog(&chart)
            .into_iter()
            .map(|r| r.key)
            .filter(|k| {
                let parts: Vec<&str> = k.split('_').collect();
                !(parts.len() == 3 && parts[0] == "raja" && Graha::from_key(parts[1]).is_some())
            })
            .collect();
        assert_eq!(keys, STATIC_ORDER);
    }
}
