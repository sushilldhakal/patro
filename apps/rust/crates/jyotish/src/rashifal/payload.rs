//! JSON payloads: one sign on one day (`build_sign_payload`), a window merged
//! (`aggregate_sign`), ingresses, the frame summary and the method block.

use panchanga::{
    RASHI_NAMA_AKSHARAS_NE, RASHI_NAMES, RASHI_NAMES_NE, RASHI_TITLE_EN, nepali_digits,
    pyfloat::py_round,
};
use serde_json::{Map, Value, json};

use super::{
    Period, Tone, bs_label_text,
    frame::DayFrame,
    layers::{AvBlock, Cycle, GocharRow, RashiLord, Scored, clamp, percent, score_sign},
    tables::{
        DIGNITY_EN, DIGNITY_KEYS, DIGNITY_NE, DOMAIN_EN, DOMAIN_HOUSES, DOMAIN_KARAKA, DOMAIN_KEYS,
        DOMAIN_NE, GRADE_FLOOR, GRAHA_PERIOD_WEIGHT, LAYER_KEYS, LAYER_LABEL_EN, LAYER_LABEL_NE,
        LAYER_WEIGHTS, LORD_COLOR_EN, LORD_COLOR_NE, LORD_DISHA_EN, LORD_DISHA_NE, LORD_NUMBER,
        MOORTI_EN, MOORTI_KEYS, MOORTI_NE,
    },
    text::{Inputs, Lang, compose, layer_note, remedy},
};
use crate::{Graha, graha::SIGN_LORD};

/// `AGGREGATE_PEAK_WEIGHT`.
const AGGREGATE_PEAK_WEIGHT: f64 = 0.35;

fn insert_all(map: &mut Map<String, Value>, value: Value) {
    if let Value::Object(fields) = value {
        map.extend(fields);
    }
}

/// `grade_for_percent`.
fn grade(percent: i64) -> Value {
    let (_, key, ne, en) = GRADE_FLOOR
        .iter()
        .copied()
        .find(|g| percent >= g.0)
        .unwrap_or((0, "nil", "निर्बल", "Nil"));
    json!({"grade": key, "grade_ne": ne, "grade_en": en})
}

/// `_sign_identity`.
fn identity(rashi: usize) -> Value {
    json!({
        "index": rashi, "id": rashi + 1, "name": RASHI_NAMES_NE[rashi], "name_en": RASHI_NAMES[rashi],
        "title_en": RASHI_TITLE_EN[rashi], "syllables_ne": RASHI_NAMA_AKSHARAS_NE[rashi],
    })
}

/// `_lord_luck`.
fn lord_luck(rashi: usize, hora_window: Option<&(String, String)>) -> Value {
    let lord = SIGN_LORD[rashi];
    let i = lord.index();
    let number = LORD_NUMBER[i];
    let lucky_time = hora_window.map_or(Value::Null, |(start, end)| {
        json!({
            "planet": lord.key(), "planet_ne": lord.ne(), "planet_en": lord.en(),
            "start_local_time_short": start, "end_local_time_short": end, "phase": "day",
        })
    });
    json!({
        "lucky_lord": lord.key(), "lucky_lord_ne": lord.ne(), "lucky_lord_en": lord.en(),
        "lucky_color_ne": LORD_COLOR_NE[i], "lucky_color_en": LORD_COLOR_EN[i],
        "lucky_number": number, "lucky_number_ne": nepali_digits(number), "lucky_number_en": number.to_string(),
        "lucky_direction_ne": LORD_DISHA_NE[i], "lucky_direction_en": LORD_DISHA_EN[i],
        "lucky_time": lucky_time,
    })
}

pub(crate) fn lord_json(l: &RashiLord) -> Value {
    json!({
        "score": l.score, "lord": l.lord.key(), "lord_ne": l.lord.ne(), "lord_en": l.lord.en(),
        "house": l.house, "sign": l.sign + 1, "sign_ne": RASHI_NAMES_NE[l.sign], "sign_en": RASHI_NAMES[l.sign],
        "dignity": DIGNITY_KEYS[l.dignity], "dignity_ne": DIGNITY_NE[l.dignity], "dignity_en": DIGNITY_EN[l.dignity],
        "combust": l.combust, "retrograde": l.retrograde,
    })
}

pub(crate) fn rows_json(rows: &[GocharRow]) -> Value {
    Value::Array(
        rows.iter()
            .map(|r| {
                json!({
                    "graha": r.graha.key(), "graha_ne": r.graha.ne(), "graha_en": r.graha.en(),
                    "sign": r.sign + 1, "sign_ne": RASHI_NAMES_NE[r.sign], "sign_en": RASHI_NAMES[r.sign],
                    "house": r.house, "favourable": r.favourable,
                    "vedha_by": r.vedha_by.map(Graha::key), "vedha_by_ne": r.vedha_by.map(Graha::ne),
                    "bindu": r.bindu, "retrograde": r.retrograde, "combust": r.combust,
                    "weight": r.weight, "score": r.score,
                })
            })
            .collect(),
    )
}

pub(crate) fn av_json(a: &AvBlock) -> Value {
    json!({"score": a.score, "sav": a.sav, "sav_trikona": a.sav_trikona, "sav_kendra": a.sav_kendra})
}

pub(crate) fn cycle_json(c: &Cycle) -> Value {
    json!({
        "score": c.score, "graha": c.graha.key(), "graha_ne": c.graha.ne(), "graha_en": c.graha.en(),
        "house": c.house, "sign": c.sign + 1, "sign_ne": RASHI_NAMES_NE[c.sign], "sign_en": RASHI_NAMES[c.sign],
    })
}

/// One domain row: `value` is what percent and tone are read from.
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

/// A component row: `value` is the layer score, `note_from` the scored day its note reads.
fn component(index: usize, value: f64, weight: f64, note_from: &Scored) -> Value {
    json!({
        "key": LAYER_KEYS[index], "label_ne": LAYER_LABEL_NE[index], "label_en": LAYER_LABEL_EN[index],
        "score": py_round(value, 4), "percent": percent(value), "weight": weight,
        "tone": Tone::for_score(value).key(),
        "note_ne": layer_note(index, note_from, Lang::Ne), "note_en": layer_note(index, note_from, Lang::En),
    })
}

/// Components with a weight, heaviest first (stable, as `sorted(reverse=True)`).
fn components(values: [f64; 8], period: Period, note_from: &Scored) -> Value {
    let weights = &LAYER_WEIGHTS[period.index()];
    let mut order: Vec<usize> = (0..8).filter(|&i| weights[i] > 0.0).collect();
    order.sort_by(|&a, &b| {
        weights[b]
            .partial_cmp(&weights[a])
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Value::Array(
        order
            .into_iter()
            .map(|i| component(i, values[i], weights[i], note_from))
            .collect(),
    )
}

fn inputs<'a>(
    s: &'a Scored,
    tone: Tone,
    period: Period,
    domains: &'a [(usize, f64)],
) -> Inputs<'a> {
    Inputs {
        tone,
        period,
        rows: &s.rows,
        domains,
        lord: &s.rashi_lord,
        chandra: &s.chandrabala,
        moorti: &s.moorti,
        sav: s.ashtakavarga.sav,
        cycle: &s.cycle,
        vaara: &s.vaara,
    }
}

/// The chandrabala/moorti fields the old cards read.
fn legacy_fields(s: &Scored) -> Value {
    let (tara, quality, _, _) = s.chandrabala.labels();
    let m = &s.moorti;
    json!({
        "tara": tara, "quality": quality, "tara_num": s.chandrabala.tara_num,
        "house_from_moon": m.house_from_moon, "moorti": MOORTI_KEYS[m.kind],
        "moorti_ne": MOORTI_NE[m.kind], "moorti_en": MOORTI_EN[m.kind],
    })
}

/// `build_sign_payload`.
pub(crate) fn sign_payload(frame: &DayFrame, rashi: usize, period: Period) -> Value {
    let s = score_sign(frame, rashi, period);
    let tone = s.tone();
    let mut out = Map::new();
    insert_all(&mut out, identity(rashi));
    insert_all(&mut out, lord_luck(rashi, s.vaara.hora_window.as_ref()));
    insert_all(
        &mut out,
        json!({
            "score": s.score, "percent": s.percent(), "stars": tone.rank() + 1, "tone": tone.key(),
        }),
    );
    insert_all(&mut out, grade(s.percent()));
    insert_all(&mut out, legacy_fields(&s));
    out.insert("rashi_lord".into(), lord_json(&s.rashi_lord));
    out.insert(
        "components".into(),
        components(s.layer_scores(), period, &s),
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
    out.insert("ashtakavarga".into(), av_json(&s.ashtakavarga));
    out.insert("cycle".into(), cycle_json(&s.cycle));
    out.insert("remedy_ne".into(), json!(remedy(&s.rows, Lang::Ne)));
    out.insert("remedy_en".into(), json!(remedy(&s.rows, Lang::En)));
    let domains: Vec<(usize, f64)> = s.domains.iter().map(|d| (d.key, d.score)).collect();
    for lang in Lang::BOTH {
        let key = if lang == Lang::Ne {
            "prediction_ne"
        } else {
            "prediction_en"
        };
        out.insert(
            key.into(),
            json!(compose(&inputs(&s, tone, period, &domains), lang)),
        );
    }
    Value::Object(out)
}

/// `_day_marker`.
fn day_marker(frame: &DayFrame, score: f64) -> Value {
    json!({
        "date_ad": frame.date.to_string(), "date_bs": bs_label_text(frame.date),
        "score": py_round(score, 4), "percent": percent(score), "tone": Tone::for_score(score).key(),
    })
}

#[expect(
    clippy::cast_precision_loss,
    reason = "a window holds at most ~130 days"
)]
fn mean(values: impl Iterator<Item = f64>, n: usize) -> f64 {
    values.fold(0.0, |acc, v| acc + v) / n as f64
}

/// `aggregate_sign`: a window of frames merged into one reading.
#[expect(
    clippy::too_many_lines,
    reason = "one payload, built in Python's key order"
)]
pub(crate) fn aggregate_sign(rashi: usize, frames: &[DayFrame], period: Period) -> Value {
    let scored: Vec<Scored> = frames
        .iter()
        .map(|f| score_sign(f, rashi, period))
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

    let mid = &scored[n / 2];
    let pct = percent(score);
    let mut out = Map::new();
    insert_all(&mut out, identity(rashi));
    insert_all(&mut out, lord_luck(rashi, None));
    insert_all(
        &mut out,
        json!({"score": py_round(score, 4), "percent": pct, "stars": tone.rank() + 1, "tone": tone.key()}),
    );
    insert_all(&mut out, grade(pct));
    out.insert("mean_score".into(), json!(py_round(clamp(avg), 4)));
    insert_all(&mut out, legacy_fields(mid));
    out.insert("rashi_lord".into(), lord_json(&mid.rashi_lord));
    out.insert(
        "components".into(),
        components(layer_means, period, &scored[0]),
    );
    out.insert(
        "domains".into(),
        Value::Array(
            domain_rounded
                .iter()
                .map(|&(i, r)| domain_json(i, r, domain_values[i], &[]))
                .collect(),
        ),
    );
    out.insert("gochar".into(), rows_json(&mid.rows));
    out.insert("ashtakavarga".into(), av_json(&mid.ashtakavarga));
    out.insert("cycle".into(), cycle_json(&mid.cycle));
    out.insert("days_in_period".into(), json!(frames.len()));
    let best_marker = day_marker(&frames[best_i], best);
    let weak_marker = day_marker(&frames[worst_i], worst);
    out.insert("best_day".into(), best_marker.clone());
    out.insert("weak_day".into(), weak_marker.clone());
    out.insert("remedy_ne".into(), json!(remedy(&mid.rows, Lang::Ne)));
    out.insert("remedy_en".into(), json!(remedy(&mid.rows, Lang::En)));
    let label = |m: &Value| {
        m["date_bs"]
            .as_str()
            .or_else(|| m["date_ad"].as_str())
            .unwrap_or_default()
            .to_owned()
    };
    for lang in Lang::BOTH {
        let base = compose(&inputs(mid, tone, period, &domain_rounded), lang);
        let (key, window) = if lang == Lang::Ne {
            (
                "prediction_ne",
                format!(
                    " यस अवधिको सबैभन्दा अनुकूल दिन {}, सबैभन्दा सतर्क रहनुपर्ने दिन {}।",
                    nepali_digits(label(&best_marker)),
                    nepali_digits(label(&weak_marker))
                ),
            )
        } else {
            (
                "prediction_en",
                format!(
                    " The strongest day in this window is {}; the one to watch is {}.",
                    best_marker["date_ad"].as_str().unwrap_or_default(),
                    weak_marker["date_ad"].as_str().unwrap_or_default()
                ),
            )
        };
        out.insert(key.into(), json!(format!("{base}{window}")));
    }
    Value::Object(out)
}

/// `detect_ingresses`: sign changes between consecutive frames.
pub(crate) fn ingresses(frames: &[DayFrame], grahas: &[Graha], rashi: Option<usize>) -> Value {
    let mut events = Vec::new();
    for pair in frames.windows(2) {
        let (prev, curr) = (&pair[0], &pair[1]);
        for &g in grahas {
            let (from, to) = (prev.sign(g), curr.sign(g));
            if from == to {
                continue;
            }
            let mut event = json!({
                "graha": g.key(), "graha_ne": g.ne(), "graha_en": g.en(),
                "date_ad": curr.date.to_string(), "date_bs": bs_label_text(curr.date),
                "from_sign": from + 1, "from_sign_ne": RASHI_NAMES_NE[from],
                "to_sign": to + 1, "to_sign_ne": RASHI_NAMES_NE[to], "to_sign_en": RASHI_NAMES[to],
            });
            if let (Some(r), Value::Object(fields)) = (rashi, &mut event) {
                fields.insert(
                    "from_house".into(),
                    json!(super::layers::house_from(from, r)),
                );
                fields.insert("to_house".into(), json!(super::layers::house_from(to, r)));
            }
            events.push(event);
        }
    }
    Value::Array(events)
}

/// `_frame_summary`: the day-wide state every sign was read against.
pub(crate) fn frame_summary(frame: &DayFrame) -> Value {
    let (moon, sun, lagna) = (frame.moon_sign(), frame.sun_sign(), frame.lagna_sign);
    json!({
        "date_ad": frame.date.to_string(), "jd_sunrise": frame.jd_sunrise, "vaara_num": frame.vaara_num,
        "paksha": frame.paksha(), "tithi_index": frame.tithi_index, "day_fraction": frame.day_fraction,
        "moon_sign": moon + 1, "moon_sign_ne": RASHI_NAMES_NE[moon], "moon_sign_en": RASHI_NAMES[moon],
        "sun_sign": sun + 1, "sun_sign_ne": RASHI_NAMES_NE[sun], "sun_sign_en": RASHI_NAMES[sun],
        "lagna_sign": lagna + 1, "lagna_sign_ne": RASHI_NAMES_NE[lagna], "lagna_sign_en": RASHI_NAMES[lagna],
        "sarvashtakavarga": frame.sav,
    })
}

/// `method_block`.
pub(crate) fn method_block(period: Period, sample_step: usize, days: usize) -> Value {
    let p = period.index();
    let layer_weights: Map<String, Value> = LAYER_KEYS
        .iter()
        .zip(LAYER_WEIGHTS[p])
        .map(|(k, w)| ((*k).to_owned(), json!(w)))
        .collect();
    let graha_weights: Map<String, Value> = Graha::ALL
        .iter()
        .zip(GRAHA_PERIOD_WEIGHT[p])
        .map(|(g, w)| (g.key().to_owned(), json!(w)))
        .collect();
    json!({
        "frame": "surya_siddhanta",
        "ayanamsa": "Surya Siddhanta",
        "anchor": "sunrise",
        "engine": "rashifal_v2",
        "layers": LAYER_KEYS,
        "layer_weights": layer_weights,
        "graha_weights": graha_weights,
        "cycle_graha": super::tables::CYCLE_GRAHA[p].key(),
        "gochar": "brihat_samhita_benefic_houses_with_vedha",
        "ashtakavarga": "transit_chart_bav_sav (no natal chart in a rashi column)",
        "sudarshana": "udaya_lagna + chandra + surya chakras (day-wide)",
        "chandrabala": "navatara_9_cycle",
        "moorti": "transit_moon_house_from_janma_rashi",
        "lucky_fields": "rashi_lord (colour, number, direction, hora)",
        "natonnata": "day_fraction from observer latitude x solar declination",
        "naisargika": "natural-bala nudge of +/-12% on the graha weights",
        "grade_scale": "vimshopaka four-grade (full/medium/small/nil)",
        "aggregate": if period == Period::Daily { "daily" } else { "mean blended 35% toward the window's peak day" },
        "sample_step_days": sample_step,
        "days_computed": days,
    })
}
