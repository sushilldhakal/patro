//! Samvatsara: the 60-year Jovian cycle, closed form from the Surya Siddhanta's mean
//! Jupiter (`engine/calendar/samvatsara.py`, `_samvatsara_index_from_mean_jupiter`).

use astronomy::surya_siddhanta::{MeanBody, mean_sign_ingresses_since_kali};
use serde_json::{Value, json};

/// BS 2080 is Pingala (index 50): the anchor every system names alike.
const ANCHOR_BS_YEAR: i32 = 2080;
const ANCHOR_INDEX: i64 = 50;

/// (key, English, Nepali) for the 60 samvatsaras, Prabhava first.
const ENTRIES: [(&str, &str, &str); 60] = [
    ("prabhava", "Prabhava", "प्रभव"),
    ("vibhava", "Vibhava", "विभव"),
    ("shukla", "Shukla", "शुक्ल"),
    ("pramoda", "Pramoda", "प्रमोद"),
    ("prajapati", "Prajapati", "प्रजापति"),
    ("angira", "Angira", "अङ्गिरा"),
    ("shrimukha", "Shrimukha", "श्रीमुख"),
    ("bhava", "Bhava", "भाव"),
    ("yuva", "Yuva", "युव"),
    ("dhatri", "Dhatri", "धात्री"),
    ("ishvara", "Ishvara", "ईश्वर"),
    ("bahudhanya", "Bahudhanya", "बहुधान्य"),
    ("pramathi", "Pramathi", "प्रमाथी"),
    ("vikrama", "Vikrama", "विक्रम"),
    ("vrisha", "Vrisha", "वृष"),
    ("chitrabhanu", "Chitrabhanu", "चित्रभानु"),
    ("subhanu", "Subhanu", "शुभानु"),
    ("tarana", "Tarana", "तारण"),
    ("parthiva", "Parthiva", "पार्थिव"),
    ("vyaya", "Vyaya", "व्यय"),
    ("sarvajit", "Sarvajit", "सर्वजित"),
    ("sarvadhari", "Sarvadhari", "सर्वधारी"),
    ("virodhi", "Virodhi", "विरोधी"),
    ("vikriti", "Vikriti", "विकृति"),
    ("khara", "Khara", "खर"),
    ("nandana", "Nandana", "नन्दन"),
    ("vijaya", "Vijaya", "विजय"),
    ("jaya", "Jaya", "जय"),
    ("manmatha", "Manmatha", "मन्मथ"),
    ("durmukha", "Durmukha", "दुर्मुख"),
    ("hemalambi", "Hemalambi", "हेमालम्बी"),
    ("vilambi", "Vilambi", "विलम्बी"),
    ("vikari", "Vikari", "विकारी"),
    ("sharvari", "Sharvari", "शार्वरी"),
    ("plava", "Plava", "प्लव"),
    ("shubhakrit", "Shubhakrit", "शुभकृत"),
    ("shobhana", "Shobhana", "शोभन"),
    ("krodhi", "Krodhi", "क्रोधी"),
    ("vishvavasu", "Vishvavasu", "विश्वावसु"),
    ("parabhava", "Parabhava", "पराभव"),
    ("plavanga", "Plavanga", "प्लवङ्ग"),
    ("kilaka", "Kilaka", "किलक"),
    ("saumya", "Saumya", "सौम्य"),
    ("sadharana", "Sadharana", "साधारण"),
    ("virodhikrit", "Virodhikrit", "विरोधकृत"),
    ("paridhavi", "Paridhavi", "परिधावी"),
    ("pramadi", "Pramadi", "प्रमादी"),
    ("ananda", "Ananda", "आनन्द"),
    ("rakshasa", "Rakshasa", "राक्षस"),
    ("nala", "Nala", "नल"),
    ("pingala", "Pingala", "पिङ्गल"),
    ("kalayukta", "Kalayukta", "कालयुक्त"),
    ("siddharthi", "Siddharthi", "सिद्धार्थी"),
    ("raudra", "Raudra", "रौद्र"),
    ("durmati", "Durmati", "दुर्मति"),
    ("dundubhi", "Dundubhi", "दुन्दुभि"),
    ("rudhirodgari", "Rudhirodgari", "रुधिरोद्गारी"),
    ("raktakshi", "Raktakshi", "रक्ताक्षी"),
    ("krodhana", "Krodhana", "क्रोधन"),
    ("akshaya", "Akshaya", "अक्षय"),
];

fn jovian_years(bs_year: i32) -> Option<i64> {
    let jd = calendar::month_start(bs_year, 1).ok()?.to_jd_ut();
    Some(mean_sign_ingresses_since_kali(MeanBody::Jupiter, jd))
}

/// 0–59 index of a BS year's samvatsara.
#[must_use]
pub fn samvatsara_index(bs_year: i32) -> Option<usize> {
    let index =
        (ANCHOR_INDEX + jovian_years(bs_year)? - jovian_years(ANCHOR_BS_YEAR)?).rem_euclid(60);
    usize::try_from(index).ok()
}

/// The samvatsara block of the daily payload, or `null` when unresolvable.
#[must_use]
pub(crate) fn samvatsara_payload(bs_year: i32) -> Value {
    let Some(i) = samvatsara_index(bs_year) else {
        return Value::Null;
    };
    let (key, name_en, name_ne) = ENTRIES[i];
    let deity = match i {
        0..=19 => "brahma",
        20..=39 => "vishnu",
        _ => "shiva",
    };
    json!({"key": key, "name_en": name_en, "name_ne": name_ne, "cycle": i + 1, "deity": deity, "index": i + 1})
}
