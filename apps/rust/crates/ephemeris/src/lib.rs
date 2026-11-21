//! The Swiss Ephemeris 2.10.03 (the `swiss-eph` crate's vendored C library, the
//! same version pyswisseph 2.10.3.2 bundles), behind a safe API.
//!
//! The C library keeps its settings (ephemeris path, sidereal mode) in globals:
//! thread-local on Linux, process-wide on macOS, where it is built without TLS.
//! Every call here therefore runs under one process-wide lock and sets what it
//! needs inside it, so no request can change another's sidereal mode mid-call.
//! The ephemeris path is set once per thread, as `_ensure_ephemeris_for_thread`
//! does, from `SWISSEPH_EPHE_PATH` or [`set_default_path`].

use std::{
    cell::Cell,
    ffi::{CStr, CString, c_char},
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard, OnceLock, PoisonError},
};

use swiss_eph as sys;

/// Body ids (`swe.SUN` …, `swe.MEAN_NODE`, `swe.ECL_NUT`).
pub mod body {
    /// The Sun.
    pub const SUN: i32 = 0;
    /// The Moon.
    pub const MOON: i32 = 1;
    /// Mercury.
    pub const MERCURY: i32 = 2;
    /// Venus.
    pub const VENUS: i32 = 3;
    /// Mars.
    pub const MARS: i32 = 4;
    /// Jupiter.
    pub const JUPITER: i32 = 5;
    /// Saturn.
    pub const SATURN: i32 = 6;
    /// The mean lunar node (Rahu).
    pub const MEAN_NODE: i32 = 10;
    /// Obliquity and nutation.
    pub const ECL_NUT: i32 = -1;
}

/// Calculation flags (`swe.FLG_*`).
pub mod flag {
    /// The Swiss binary ephemeris.
    pub const SWIEPH: i32 = 2;
    /// The Moshier analytical model.
    pub const MOSEPH: i32 = 4;
    /// Speeds too.
    pub const SPEED: i32 = 256;
    /// Equatorial coordinates.
    pub const EQUATORIAL: i32 = 2 * 1024;
    /// Sidereal (the current sidereal mode).
    pub const SIDEREAL: i32 = 64 * 1024;
}

/// Rise/set selectors (`swe.CALC_RISE`, `swe.CALC_SET`).
pub mod rise {
    /// Rising.
    pub const RISE: i32 = 1;
    /// Setting.
    pub const SET: i32 = 2;
}

/// A refused call: the library's error text.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("{0}")]
pub struct SweError(pub String);

static LOCK: Mutex<()> = Mutex::new(());
static DEFAULT_PATH: OnceLock<PathBuf> = OnceLock::new();

thread_local! {
    static CONFIGURED: Cell<bool> = const { Cell::new(false) };
}

/// Where the `.se1` files live when `SWISSEPH_EPHE_PATH` is unset (`data/ephemeris`).
/// Only the first call counts.
pub fn set_default_path(path: &Path) {
    let _ = DEFAULT_PATH.set(path.to_path_buf());
}

fn ephe_dir() -> Option<PathBuf> {
    match std::env::var("SWISSEPH_EPHE_PATH") {
        Ok(v) if !v.trim().is_empty() => Some(PathBuf::from(v.trim())),
        _ => DEFAULT_PATH.get().cloned(),
    }
}

/// `_configure_ephemeris`: point the library at a directory holding `.se1` files;
/// without any, keep its built-in Moshier fallback.
fn configure() {
    let Some(dir) = ephe_dir() else { return };
    let has_files = std::fs::read_dir(&dir).is_ok_and(|mut entries| {
        entries.any(|e| e.is_ok_and(|e| e.path().extension().is_some_and(|x| x == "se1")))
    });
    if !has_files {
        return;
    }
    if let Ok(c) = CString::new(dir.to_string_lossy().as_bytes()) {
        // SAFETY: a valid NUL-terminated path; the library copies it.
        unsafe { sys::swe_set_ephe_path(c.as_ptr()) };
    }
}

/// The library, locked and configured for this thread.
struct Swe {
    _guard: MutexGuard<'static, ()>,
}

fn swe() -> Swe {
    let guard = LOCK.lock().unwrap_or_else(PoisonError::into_inner);
    if !CONFIGURED.with(Cell::get) {
        configure();
        CONFIGURED.with(|c| c.set(true));
    }
    Swe { _guard: guard }
}

fn err_text(buf: &[c_char; 256]) -> String {
    // SAFETY: the library NUL-terminates `serr` within its 256 bytes (AS_MAXCH).
    unsafe { CStr::from_ptr(buf.as_ptr()) }
        .to_string_lossy()
        .into_owned()
}

#[expect(
    clippy::unused_self,
    reason = "`&self` is the proof that the library lock is held"
)]
impl Swe {
    fn sid_mode(&self, mode: i32) {
        // SAFETY: plain values; held under the lock.
        unsafe { sys::swe_set_sid_mode(mode, 0.0, 0.0) };
    }

    fn calc_ut(&self, jd: f64, body: i32, flags: i32) -> Result<[f64; 6], SweError> {
        let mut xx = [0.0f64; 6];
        let mut serr = [0 as c_char; 256];
        // SAFETY: `xx` holds 6 doubles and `serr` 256 bytes, as the API requires.
        let ret = unsafe { sys::swe_calc_ut(jd, body, flags, xx.as_mut_ptr(), serr.as_mut_ptr()) };
        if ret < 0 {
            return Err(SweError(err_text(&serr)));
        }
        Ok(xx)
    }
}

/// `swe.calc_ut(jd, body, flags)` with `sidereal_mode` set first when given:
/// longitude, latitude, distance and their speeds.
///
/// # Errors
///
/// The library refused (e.g. a date outside the installed files).
pub fn calc_ut(
    jd: f64,
    body: i32,
    flags: i32,
    sidereal_mode: Option<i32>,
) -> Result<[f64; 6], SweError> {
    let s = swe();
    if let Some(mode) = sidereal_mode {
        s.sid_mode(mode);
    }
    s.calc_ut(jd, body, flags)
}

/// `swe.get_ayanamsa_ex_ut(jd, FLG_SWIEPH)[1]` under `mode` — the ayanamsha
/// `FLG_SIDEREAL` applies.
///
/// # Errors
///
/// The library refused.
pub fn ayanamsa_ex_ut(jd: f64, mode: i32) -> Result<f64, SweError> {
    let s = swe();
    s.sid_mode(mode);
    let mut daya = 0.0f64;
    let mut serr = [0 as c_char; 256];
    // SAFETY: valid out-pointers; held under the lock.
    let ret =
        unsafe { sys::swe_get_ayanamsa_ex_ut(jd, flag::SWIEPH, &raw mut daya, serr.as_mut_ptr()) };
    if ret < 0 {
        return Err(SweError(err_text(&serr)));
    }
    Ok(daya)
}

/// `swe.houses(jd, lat, lon, b"P")[1][0]`: the tropical ascendant.
///
/// # Errors
///
/// The library refused.
pub fn ascendant_tropical(jd: f64, lat: f64, lon: f64) -> Result<f64, SweError> {
    let _s = swe();
    let mut cusps = [0.0f64; 13];
    let mut ascmc = [0.0f64; 10];
    // SAFETY: 13 cusps and 10 ascmc doubles, as `swe_houses` requires for 'P'.
    let ret = unsafe {
        sys::swe_houses(
            jd,
            lat,
            lon,
            i32::from(b'P'),
            cusps.as_mut_ptr(),
            ascmc.as_mut_ptr(),
        )
    };
    if ret < 0 {
        return Err(SweError("houses failed".to_owned()));
    }
    Ok(ascmc[0])
}

/// `swe.rise_trans_true_hor`: the JD (UT) of the next rise or set after `jd`,
/// `None` when the body does not cross.
///
/// # Errors
///
/// The library refused.
#[expect(clippy::too_many_arguments, reason = "the C call's own parameters")]
pub fn rise_trans_true_hor(
    jd: f64,
    body: i32,
    rsmi: i32,
    lon: f64,
    lat: f64,
    alt: f64,
    pressure: f64,
    temperature: f64,
    horizon: f64,
) -> Result<Option<f64>, SweError> {
    let _s = swe();
    let mut geopos = [lon, lat, alt];
    let mut tret = [0.0f64; 10];
    let mut serr = [0 as c_char; 256];
    // SAFETY: geopos holds 3 doubles, tret 10, serr 256 bytes; no star name.
    let ret = unsafe {
        sys::swe_rise_trans_true_hor(
            jd,
            body,
            std::ptr::null_mut(),
            flag::SWIEPH,
            rsmi,
            geopos.as_mut_ptr(),
            pressure,
            temperature,
            horizon,
            tret.as_mut_ptr(),
            serr.as_mut_ptr(),
        )
    };
    // pyswisseph raises on -1; -2 means the body never crosses (circumpolar).
    match ret {
        -1 => Err(SweError(err_text(&serr))),
        r if r < 0 => Ok(None),
        _ => Ok(Some(tret[0])),
    }
}

/// `swe.cotrans((lon, lat, 1.0), eps)`.
#[must_use]
pub fn cotrans(lon: f64, lat: f64, eps: f64) -> [f64; 3] {
    let _s = swe();
    let mut xin = [lon, lat, 1.0];
    let mut xout = [0.0f64; 3];
    // SAFETY: both arrays hold 3 doubles.
    unsafe { sys::swe_cotrans(xin.as_mut_ptr(), xout.as_mut_ptr(), eps) };
    xout
}

/// `swe.time_equ(jd)`: apparent − mean solar time, in days.
///
/// # Errors
///
/// The library refused.
pub fn time_equ(jd: f64) -> Result<f64, SweError> {
    let _s = swe();
    let mut te = 0.0f64;
    let mut serr = [0 as c_char; 256];
    // SAFETY: valid out-pointers.
    let ret = unsafe { sys::swe_time_equ(jd, &raw mut te, serr.as_mut_ptr()) };
    if ret < 0 {
        return Err(SweError(err_text(&serr)));
    }
    Ok(te)
}

/// `swe.pheno_ut(jd, body, FLG_SWIEPH)`: phase angle, illuminated fraction,
/// elongation, apparent diameter, magnitude.
///
/// # Errors
///
/// The library refused.
pub fn pheno_ut(jd: f64, body: i32) -> Result<[f64; 5], SweError> {
    let _s = swe();
    let mut attr = [0.0f64; 20];
    let mut serr = [0 as c_char; 256];
    // SAFETY: attr holds 20 doubles as the API requires.
    let ret =
        unsafe { sys::swe_pheno_ut(jd, body, flag::SWIEPH, attr.as_mut_ptr(), serr.as_mut_ptr()) };
    if ret < 0 {
        return Err(SweError(err_text(&serr)));
    }
    Ok([attr[0], attr[1], attr[2], attr[3], attr[4]])
}

/// The library's version string.
#[must_use]
pub fn version() -> String {
    let _s = swe();
    let mut buf = [0 as c_char; 256];
    // SAFETY: a 256-byte buffer, as `swe_version` requires.
    unsafe { sys::swe_version(buf.as_mut_ptr()) };
    err_text(&buf)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_2_10_03() {
        assert_eq!(version(), "2.10.03");
    }
}
