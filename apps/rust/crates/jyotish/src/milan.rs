//! कुण्डली मिलान: Ashtakoota (Guna Milan) from the two birth Moons
//! (`engine/jyotish/milan.py`).

use panchanga::{
    NAKSHATRA_NAMES, RASHI_NAMES, RASHI_NAMES_NE,
    pyfloat::{py_int, py_mod, py_round},
};
use serde_json::{Value, json};

use crate::{
    Graha,
    ashtakavarga::sign_of,
    graha::SIGN_LORD,
    milan_tables::{
        GANA_EN, GANA_MATRIX, GANA_NE, GANA_OF_NAKSHATRA, KUTA_AREAOFLIFE, KUTA_AREAOFLIFENE,
        KUTA_IDS, KUTA_INFO, KUTA_INFONE, KUTA_MAX, NADI_ADVISORY, NADI_ADVISORY_NE, NADI_EN,
        NADI_NE, NADI_OF_NAKSHATRA, NAKSHATRA_NE, NOTE_BHAKUTA, NOTE_BHAKUTA_NE, NOTE_LOW,
        NOTE_LOW_NE, NOTE_NADI, NOTE_NADI_NE, VARNA_EN, VARNA_NE, VARNA_OF_SIGN,
        VASHYA_CLASS_OF_SIGN, VASHYA_CONTROLS, VASHYA_EN, VASHYA_NE, YONI_EN, YONI_MATRIX, YONI_NE,
        YONI_OF_NAKSHATRA,
    },
};

/// A label in both languages: (English, Nepali).
type Label = (&'static str, &'static str);
/// One kuta: (points obtained, boy's value, girl's value).
type KutaRow = (f64, Label, Label);

/// Output language of the kuta values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Lang {
    En,
    Ne,
}

/// One partner: the birth Moon's rashi and nakshatra.
#[derive(Debug, Clone, Copy)]
struct Person {
    rashi: usize,
    nak: usize,
}

/// `nakshatra_of`: (0-based nakshatra, pada with no upper clamp).
fn nakshatra_of(lon: f64) -> (usize, i64) {
    let span = 360.0 / 27.0;
    let lon = py_mod(lon, 360.0);
    let idx = usize::try_from(py_int(lon / span) % 27).unwrap_or(0);
    (idx, py_int(py_mod(lon, span) / (span / 4.0)) + 1)
}

/// `_round`: `1.0` → `1`, `1.5` stays `1.5`.
fn round_points(v: f64) -> Value {
    if v.fract() == 0.0 {
        #[expect(clippy::cast_possible_truncation, reason = "at most 36 points")]
        let i = v as i64;
        json!(i)
    } else {
        json!(py_round(v, 1))
    }
}

fn relation(a: Graha, b: Graha) -> i32 {
    if a.friends().contains(&b) {
        1
    } else if a.enemies().contains(&b) {
        -1
    } else {
        0
    }
}

/// (obtained, boy value, girl value) per kuta, labels as (en, ne).
fn kutas(boy: Person, girl: Person) -> [KutaRow; 8] {
    let (br, gr, bn, gn) = (boy.rashi, girl.rashi, boy.nak, girl.nak);
    let varna = {
        let (b, g) = (VARNA_OF_SIGN[br], VARNA_OF_SIGN[gr]);
        (
            if b >= g { 1.0 } else { 0.0 },
            (VARNA_EN[b - 1], VARNA_NE[b - 1]),
            (VARNA_EN[g - 1], VARNA_NE[g - 1]),
        )
    };
    let vashya = {
        let obtained = if br == gr {
            2.0
        } else {
            let b_ctrl = VASHYA_CONTROLS[br].contains(&gr);
            let g_ctrl = VASHYA_CONTROLS[gr].contains(&br);
            if b_ctrl && g_ctrl {
                2.0
            } else if b_ctrl || g_ctrl {
                1.0
            } else {
                0.0
            }
        };
        let (bc, gc) = (VASHYA_CLASS_OF_SIGN[br], VASHYA_CLASS_OF_SIGN[gr]);
        (
            obtained,
            (VASHYA_EN[bc], VASHYA_NE[bc]),
            (VASHYA_EN[gc], VASHYA_NE[gc]),
        )
    };
    let half = |from: usize, to: usize| {
        let count = (to + 27 - from) % 27 + 1;
        let tara = if count % 9 == 0 { 9 } else { count % 9 };
        if matches!(tara, 3 | 5 | 7) { 0.0 } else { 1.5 }
    };
    let tara = (
        half(bn, gn) + half(gn, bn),
        (NAKSHATRA_NAMES[bn], NAKSHATRA_NE[bn]),
        (NAKSHATRA_NAMES[gn], NAKSHATRA_NE[gn]),
    );
    let yoni = {
        let (by, gy) = (YONI_OF_NAKSHATRA[bn], YONI_OF_NAKSHATRA[gn]);
        (
            f64::from(YONI_MATRIX[by][gy]),
            (YONI_EN[by], YONI_NE[by]),
            (YONI_EN[gy], YONI_NE[gy]),
        )
    };
    let maitri = {
        let (bl, gl) = (SIGN_LORD[br], SIGN_LORD[gr]);
        let obtained = if bl == gl {
            5.0
        } else {
            match (relation(bl, gl), relation(gl, bl)) {
                (1, 1) => 5.0,
                (1, 0) | (0, 1) => 4.0,
                (0, 0) => 3.0,
                (1, -1) | (-1, 1) => 1.0,
                (0, -1) | (-1, 0) => 0.5,
                _ => 0.0,
            }
        };
        (obtained, (bl.en(), bl.ne()), (gl.en(), gl.ne()))
    };
    let gana = {
        let (bg, gg) = (GANA_OF_NAKSHATRA[bn], GANA_OF_NAKSHATRA[gn]);
        (
            f64::from(GANA_MATRIX[bg][gg]),
            (GANA_EN[bg], GANA_NE[bg]),
            (GANA_EN[gg], GANA_NE[gg]),
        )
    };
    let bhakuta = (
        if matches!((gr + 12 - br) % 12, 1 | 4 | 5 | 7 | 8 | 11) {
            0.0
        } else {
            7.0
        },
        (RASHI_NAMES[br], RASHI_NAMES_NE[br]),
        (RASHI_NAMES[gr], RASHI_NAMES_NE[gr]),
    );
    let nadi = {
        let (b, g) = (NADI_OF_NAKSHATRA[bn], NADI_OF_NAKSHATRA[gn]);
        (
            if b == g { 0.0 } else { 8.0 },
            (NADI_EN[b], NADI_NE[b]),
            (NADI_EN[g], NADI_NE[g]),
        )
    };
    [varna, vashya, tara, yoni, maitri, gana, bhakuta, nadi]
}

/// `compute_ashtakuta(boy, girl, lang)`.
fn ashtakuta(boy: Person, girl: Person, lang: Lang) -> Value {
    let en = lang == Lang::En;
    let rows = kutas(boy, girl);
    let total = rows.iter().fold(0.0, |a, r| a + r.0);
    let nadi_dosha = NADI_OF_NAKSHATRA[boy.nak] == NADI_OF_NAKSHATRA[girl.nak];
    let bhakuta_bad = rows[6].0 == 0.0;
    let (rec, rec_en, rec_ne) = if total >= 32.0 {
        ("excellent", "Excellent match", "उत्तम मिलन")
    } else if total >= 25.0 {
        ("very_good", "Very good match", "धेरै राम्रो मिलन")
    } else if total >= 18.0 {
        ("middling", "Acceptable match", "स्वीकार्य मिलन")
    } else {
        ("inauspicious", "Not recommended", "मिलन उपयुक्त छैन")
    };
    let kuta_rows: Vec<Value> = rows
        .iter()
        .enumerate()
        .map(|(i, (obtained, b, g))| {
            json!({
                "id": KUTA_IDS[i], "max": KUTA_MAX[i], "obtained": round_points(*obtained),
                "boyValue": if en { b.0 } else { b.1 }, "girlValue": if en { g.0 } else { g.1 },
                "areaOfLife": KUTA_AREAOFLIFE[i], "areaOfLifeNe": KUTA_AREAOFLIFENE[i],
                "info": KUTA_INFO[i], "infoNe": KUTA_INFONE[i],
            })
        })
        .collect();
    let total_text = match round_points(total) {
        Value::Number(n) if n.is_i64() => n.to_string(),
        _ => common::pyjson::float_repr(py_round(total, 1)),
    };
    let mut notes = vec![format!(
        "Total compatibility score is {total_text} out of 36 gunas."
    )];
    let mut notes_ne = vec![format!("कुल मिलन अङ्क ३६ मध्ये {total_text} गुण।")];
    if nadi_dosha {
        notes.push(NOTE_NADI.to_owned());
        notes_ne.push(NOTE_NADI_NE.to_owned());
    }
    if bhakuta_bad {
        notes.push(NOTE_BHAKUTA.to_owned());
        notes_ne.push(NOTE_BHAKUTA_NE.to_owned());
    }
    if total < 18.0 {
        notes.push(NOTE_LOW.to_owned());
        notes_ne.push(NOTE_LOW_NE.to_owned());
    }
    json!({
        "kutas": kuta_rows,
        "totalObtained": round_points(total),
        "totalMax": 36,
        "recommendation": rec,
        "recommendationLabel": rec_en,
        "recommendationLabelNe": rec_ne,
        "nadiDosha": nadi_dosha,
        "nadiDoshaAdvisory": if nadi_dosha { json!(NADI_ADVISORY) } else { Value::Null },
        "nadiDoshaAdvisoryNe": if nadi_dosha { json!(NADI_ADVISORY_NE) } else { Value::Null },
        "bhakutaUnfavorable": bhakuta_bad,
        "doshaAnalysis": [
            {"id": "nadi", "labelEn": "Nadi Dosha", "labelNe": "नाडी दोष", "present": nadi_dosha},
            {"id": "bhakuta", "labelEn": "Bhakuta Dosha", "labelNe": "भकूट दोष", "present": bhakuta_bad},
            {"id": "gana", "labelEn": "Gana Dosha", "labelNe": "गण दोष", "present": rows[5].0 <= 1.0},
        ],
        "notes": notes,
        "notesNe": notes_ne,
    })
}

/// One partner's input: the birth Moon longitude, `birth_instant.isoformat()` and the
/// location dict the route echoes.
#[derive(Debug, Clone)]
pub struct Partner {
    /// Sidereal Moon longitude at birth (the spashta value).
    pub moon_longitude: f64,
    /// The birth instant as Python prints it.
    pub birth_instant: String,
    /// `{"lat", "lon", "timezone"}`.
    pub location: Value,
}

fn person_json(p: &Partner) -> (Person, Value) {
    let rashi = sign_of(p.moon_longitude);
    let (nak, pada) = nakshatra_of(p.moon_longitude);
    (
        Person { rashi, nak },
        json!({
            "moonLongitude": py_round(p.moon_longitude, 6),
            "moonRashiNum": rashi + 1,
            "moonRashiNe": RASHI_NAMES_NE[rashi],
            "moonRashiEn": RASHI_NAMES[rashi],
            "nakshatraIndex": nak,
            "nakshatraNe": NAKSHATRA_NE[nak],
            "nakshatraEn": NAKSHATRA_NAMES[nak],
            "pada": pada,
            "birth_instant": p.birth_instant,
            "location": p.location,
        }),
    )
}

/// `build_kundali_milan(boy, girl, lang=…)`.
#[must_use]
pub fn kundali_milan(boy: &Partner, girl: &Partner, lang: &str) -> Value {
    let en = lang.starts_with("en");
    let (b, boy_json) = person_json(boy);
    let (g, girl_json) = person_json(girl);
    json!({
        "result": ashtakuta(b, g, if en { Lang::En } else { Lang::Ne }),
        "boy": boy_json,
        "girl": girl_json,
        "ayanamsha": "surya_siddhanta",
        "lang": if en { "en" } else { "ne" },
    })
}
