//! The Swiss Ephemeris through this crate against pyswisseph 2.10.3.2, bit for bit
//! (`scripts/gen_swe_golden.py`): positions in every flag and ayanamsha mode the
//! engine uses, the ayanamsha itself, ascendants, rise/set, the equation of time
//! and planetary phenomena, from 13000 BCE to 17000 CE.

use std::path::Path;

use serde_json::Value;

fn f(v: &Value) -> f64 {
    v.as_f64().expect("number")
}

fn same(label: &str, got: f64, want: &Value, bad: &mut Vec<String>) {
    let want = f(want);
    if got.to_bits() != want.to_bits() && !(got == 0.0 && want == 0.0) {
        bad.push(format!("{label}: rust {got:?} python {want:?}"));
    }
}

#[test]
fn matches_pyswisseph() {
    ephemeris::set_default_path(
        &Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../api/data/ephemeris"),
    );
    let g: Value = serde_json::from_str(include_str!("fixtures/swe_golden.json")).expect("golden");
    assert_eq!(
        ephemeris::version(),
        g["version"].as_str().expect("version")
    );
    let mut bad = Vec::new();
    for c in g["calc"].as_array().expect("calc") {
        let jd = f(&c["jd"]);
        let body = i32::try_from(c["body"].as_i64().expect("body")).expect("i32");
        let flags = i32::try_from(c["flags"].as_i64().expect("flags")).expect("i32");
        let mode = c["mode"].as_i64().map(|m| i32::try_from(m).expect("i32"));
        let label = format!("calc jd={jd} body={body} flags={flags} mode={mode:?}");
        match (ephemeris::calc_ut(jd, body, flags, mode), c.get("xx")) {
            (Ok(xx), Some(want)) => {
                for (i, w) in want.as_array().expect("xx").iter().enumerate() {
                    same(&format!("{label}[{i}]"), xx[i], w, &mut bad);
                }
            }
            (Err(_), None) => {}
            (got, _) => bad.push(format!("{label}: rust {got:?} python {c}")),
        }
    }
    for a in g["ayanamsa"].as_array().expect("ayanamsa") {
        let mode = i32::try_from(a["mode"].as_i64().expect("mode")).expect("i32");
        if let Some(v) = a.get("value") {
            let got = ephemeris::ayanamsa_ex_ut(f(&a["jd"]), mode).expect("ayanamsa");
            same(&format!("ayanamsa {a}"), got, v, &mut bad);
        }
    }
    for a in g["ascendant"].as_array().expect("ascendant") {
        let got =
            ephemeris::ascendant_tropical(f(&a["jd"]), f(&a["lat"]), f(&a["lon"])).expect("asc");
        same(&format!("ascendant {a}"), got, &a["value"], &mut bad);
    }
    for r in g["rise"].as_array().expect("rise") {
        let geo = r["geo"].as_array().expect("geo");
        let got = ephemeris::rise_trans_true_hor(
            f(&r["jd"]),
            i32::try_from(r["body"].as_i64().expect("body")).expect("i32"),
            i32::try_from(r["rsmi"].as_i64().expect("rsmi")).expect("i32"),
            f(&geo[0]),
            f(&geo[1]),
            f(&geo[2]),
            1010.0,
            10.0,
            f(&r["dip"]),
        );
        match (got, r.get("value")) {
            (Ok(Some(t)), Some(v)) if !v.is_null() => same(&format!("rise {r}"), t, v, &mut bad),
            (Ok(None), Some(Value::Null)) | (Err(_), None) => {}
            (got, _) => bad.push(format!("rise {r}: rust {got:?}")),
        }
    }
    for t in g["time_equ"].as_array().expect("time_equ") {
        let got = ephemeris::time_equ(f(&t["jd"])).expect("time_equ");
        same(&format!("time_equ {t}"), got, &t["value"], &mut bad);
    }
    for p in g["pheno"].as_array().expect("pheno") {
        let body = i32::try_from(p["body"].as_i64().expect("body")).expect("i32");
        let got = ephemeris::pheno_ut(f(&p["jd"]), body).expect("pheno");
        for (i, w) in p["value"].as_array().expect("value").iter().enumerate() {
            same(&format!("pheno {p}[{i}]"), got[i], w, &mut bad);
        }
    }
    assert!(
        bad.is_empty(),
        "{} mismatches, first:\n{}",
        bad.len(),
        bad.iter().take(15).cloned().collect::<Vec<_>>().join("\n")
    );
}
