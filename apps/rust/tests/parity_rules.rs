//! The parity rules themselves: drift in printed times, nothing else.

mod support;

use support::parity::{difference, text_close};

#[test]
fn clocks_drift_but_nothing_else() {
    assert!(
        text_close("105:19:07", "105:19:06"),
        "a ghati clock, one second"
    );
    assert!(
        text_close("7:35:11", "7:35:10"),
        "an hours clock, one second"
    );
    assert!(
        difference(
            r#"{"end_ghati_clock":"53:42:06"}"#,
            r#"{"end_ghati_clock":"53:42:09"}"#
        )
        .is_none(),
        "three vipala is 1.2 s"
    );
    assert!(
        difference(
            r#"{"end_ghati_clock":"53:42:06"}"#,
            r#"{"end_ghati_clock":"53:42:20"}"#
        )
        .is_some(),
        "fourteen vipala is 5.6 s"
    );
    assert!(
        text_close("2026-11-08 10:49", "2026-11-08 10:48"),
        "a minute display"
    );
    assert!(
        text_close(
            "-0044-03-14T09:28:11.586842+00:00",
            "-0044-03-14T09:28:11.674811+00:00"
        ),
        "an instant, under a second"
    );
    assert!(text_close("23:59:59", "00:00:01"), "across midnight");
    assert!(
        !text_close("2026-11-08 10:49", "2026-11-09 10:49"),
        "a different day"
    );
    assert!(!text_close("Ashwini", "Bharani"), "a different name");
    assert!(
        !text_close("105:19:07", "105:19:12"),
        "five seconds is a real difference"
    );
    assert!(
        difference(r#"{"a":14}"#, r#"{"a":15}"#).is_some(),
        "integers are exact"
    );
    assert!(
        difference(r#"{"a":1.0042}"#, r#"{"a":1.0041}"#).is_none(),
        "floats drift a hair"
    );
    assert!(
        difference(r#"{"a":1,"b":2}"#, r#"{"b":2,"a":1}"#).is_some(),
        "key order counts"
    );
    assert!(
        difference("Sunrise 06:59\nx", "Sunrise 07:00\nx").is_none(),
        "text lines"
    );
}
