//! Swiss Ephemeris's calendar arithmetic (`swe_julday`, `swe_revjul`), ported line for line.

/// Which calendar a date label is read in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Calendar {
    /// Julian calendar (Swiss Ephemeris `SE_JUL_CAL`).
    Julian,
    /// Proleptic Gregorian calendar (`SE_GREG_CAL`).
    Gregorian,
}

/// Julian Day of a calendar date at `hour` (UT), exactly as `swe_julday` computes it.
#[must_use]
#[expect(
    clippy::float_cmp,
    reason = "swe_julday tests whole centuries with exact float equality"
)]
pub fn julday(year: i32, month: u32, day: u32, hour: f64, calendar: Calendar) -> f64 {
    let mut u = f64::from(year);
    if month < 3 {
        u -= 1.0;
    }
    let u0 = u + 4712.0;
    let mut u1 = f64::from(month) + 1.0;
    if u1 < 4.0 {
        u1 += 12.0;
    }
    let mut jd =
        (u0 * 365.25).floor() + (30.6 * u1 + 0.000_001).floor() + f64::from(day) + hour / 24.0
            - 63.5;
    if calendar == Calendar::Gregorian {
        let mut u2 = (u.abs() / 100.0).floor() - (u.abs() / 400.0).floor();
        if u < 0.0 {
            u2 = -u2;
        }
        jd = jd - u2 + 2.0;
        if u < 0.0 && u / 100.0 == (u / 100.0).floor() && u / 400.0 != (u / 400.0).floor() {
            jd -= 1.0;
        }
    }
    jd
}

/// (year, month, day, hour UT) of a Julian Day, exactly as `swe_revjul` computes it.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "values are floor()ed day/month/year counts, cast like the C (int) casts"
)]
pub fn revjul(jd: f64, calendar: Calendar) -> (i32, u32, u32, f64) {
    let mut u0 = jd + 32082.5;
    if calendar == Calendar::Gregorian {
        let mut u1 = u0 + (u0 / 36525.0).floor() - (u0 / 146_100.0).floor() - 38.0;
        if jd >= 1_830_691.5 {
            u1 += 1.0;
        }
        u0 = u0 + (u1 / 36525.0).floor() - (u1 / 146_100.0).floor() - 38.0;
    }
    let u2 = (u0 + 123.0).floor();
    let u3 = ((u2 - 122.2) / 365.25).floor();
    let u4 = ((u2 - (365.25 * u3).floor()) / 30.6001).floor();
    let mut month = (u4 - 1.0) as i32;
    if month > 12 {
        month -= 12;
    }
    let day = (u2 - (365.25 * u3).floor() - (30.6001 * u4).floor()) as i32;
    let year = (u3 + ((u4 - 2.0) / 12.0).floor() - 4800.0) as i32;
    let hour = (jd - (jd + 0.5).floor() + 0.5) * 24.0;
    (year, month as u32, day as u32, hour)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_days() {
        assert_eq!(julday(2000, 1, 1, 12.0, Calendar::Gregorian), 2_451_545.0);
        assert_eq!(julday(1582, 10, 15, 0.0, Calendar::Gregorian), 2_299_160.5);
        assert_eq!(julday(1582, 10, 4, 0.0, Calendar::Julian), 2_299_159.5);
        assert_eq!(revjul(2_451_545.0, Calendar::Gregorian), (2000, 1, 1, 12.0));
    }
}
