//! The typed writer and the tree writer produce the same bytes for every recorded
//! response body, in both separator styles.

use common::{
    pyjson::{Style, dumps},
    pyser::to_string,
};
use serde_json::Value;

#[test]
fn every_recorded_body_writes_the_same_both_ways() {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures");
    let mut bodies = 0;
    for entry in std::fs::read_dir(dir).expect("fixtures") {
        let path = entry.expect("entry").path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let text = std::fs::read_to_string(&path).expect("read");
        let Ok(Value::Array(cases)) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        for case in cases {
            let Some(body) = case.get("body").and_then(Value::as_str) else {
                continue;
            };
            let Ok(value) = serde_json::from_str::<Value>(body) else {
                continue;
            };
            for style in [Style::Compact, Style::Default] {
                assert_eq!(
                    to_string(&value, style),
                    dumps(&value, style),
                    "{}: {style:?}",
                    path.display()
                );
            }
            bodies += 1;
        }
    }
    assert!(bodies > 500, "checked {bodies} bodies");
}
