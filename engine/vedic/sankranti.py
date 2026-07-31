"""Sankranti (solar ingress) detection for month naming and solar festivals."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from engine.astronomy.engine import EphemerisError, default_engine
from engine.astronomy.jd_calendar import CivilDay, civil_day_add
from engine.astronomy.rashi import RASHI_NAMES
from engine.astronomy.sun import sun_service
from engine.astronomy.ut_instant import UtInstant, as_julian_day, day_instant_utc

BS_MONTH_NAMES = [
    "Baishakh",
    "Jestha",
    "Ashadh",
    "Shrawan",
    "Bhadra",
    "Ashwin",
    "Kartik",
    "Mangsir",
    "Poush",
    "Magh",
    "Falgun",
    "Chaitra",
]

UNIX_EPOCH_UTC = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _angular_error(value_deg: float, target_deg: float) -> float:
    return ((value_deg - target_deg + 180.0) % 360.0) - 180.0


def _to_unix_seconds(dt: datetime) -> float:
    return (dt - UNIX_EPOCH_UTC).total_seconds()


def _from_unix_seconds(seconds: float) -> datetime:
    try:
        return UNIX_EPOCH_UTC + timedelta(seconds=seconds)
    except OverflowError:
        # Pre-1 CE: no ``datetime`` can hold it, so hand back a JD-backed instant.
        # Kept as a fallback rather than always going through JD because the JD
        # round-trip truncates to whole seconds, which would shift CE results.
        from engine.astronomy.jd_calendar import unix_seconds_to_jd_ut

        return UtInstant(unix_seconds_to_jd_ut(seconds))  # type: ignore[return-value]


def get_sun_rashi_at_time(dt: datetime) -> int:
    sun_long = sun_service.longitude(as_julian_day(dt), sidereal=True)
    return int(sun_long / 30) % 12


def get_sun_rashi_at_jd(jd: float) -> int:
    sun_long = default_engine.sun_longitude(float(jd), sidereal=True)
    return int(sun_long / 30) % 12


def _angular_error_jd(jd: float, target_degree: float) -> float:
    sun_long = default_engine.sun_longitude(float(jd), sidereal=True)
    return _angular_error(sun_long, target_degree)


def _bisect_sankranti_jd(
    target_degree: float, low_jd: float, high_jd: float, tolerance_days: float = 1 / 86400
) -> float:
    tolerance = float(tolerance_days)
    low, high = float(low_jd), float(high_jd)
    for _ in range(60):
        if high - low < tolerance:
            break
        mid = (low + high) / 2
        mid_err = _angular_error_jd(mid, target_degree)
        low_err = _angular_error_jd(low, target_degree)
        if low_err == 0:
            return low
        if mid_err == 0:
            return mid
        if low_err * mid_err <= 0:
            high = mid
        else:
            low = mid
    return high


def find_sankranti_brent_jd(
    target_degree: float,
    low_jd: float,
    high_jd: float,
    tolerance_days: float = 60 / 86400,
    max_iterations: int = 50,
) -> float:
    """Refine a sankranti instant in JD (UT), including BCE dates."""
    tol = float(tolerance_days)
    a, b = float(low_jd), float(high_jd)

    def f(jd: float) -> float:
        return _angular_error_jd(jd, target_degree)

    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        return _bisect_sankranti_jd(target_degree, a, b, tolerance_days=tolerance_days)

    if abs(fa) < abs(fb):
        a, b = b, a
        fa, fb = fb, fa

    c, fc, d = a, fa, a
    mflag = True

    for _ in range(max_iterations):
        if abs(b - a) <= tol or fb == 0:
            return b
        if fa != fc and fb != fc:
            s = (
                (a * fb * fc) / ((fa - fb) * (fa - fc))
                + (b * fa * fc) / ((fb - fa) * (fb - fc))
                + (c * fa * fb) / ((fc - fa) * (fc - fb))
            )
        else:
            s = b - fb * (b - a) / (fb - fa)

        cond1 = not (min((3 * a + b) / 4, b) < s < max((3 * a + b) / 4, b))
        cond2 = mflag and abs(s - b) >= abs(b - c) / 2
        cond3 = (not mflag) and abs(s - b) >= abs(c - d) / 2
        cond4 = mflag and abs(b - c) < tol
        cond5 = (not mflag) and abs(c - d) < tol

        if cond1 or cond2 or cond3 or cond4 or cond5:
            s = (a + b) / 2
            mflag = True
        else:
            mflag = False

        fs = f(s)
        d, c = c, b
        fc = fb
        if fa * fs < 0:
            b, fb = s, fs
        else:
            a, fa = s, fs
        if abs(fa) < abs(fb):
            a, b = b, a
            fa, fb = fb, fa

    return b


def find_sankranti_after_jd(
    target_rashi: int, after_jd: float, max_days: int = 40
) -> float | None:
    """Next sidereal sankranti at or after ``after_jd`` (Julian Day UT)."""
    target_degree = target_rashi * 30
    prev_rashi = (target_rashi - 1) % 12
    current_rashi = get_sun_rashi_at_jd(after_jd)

    if current_rashi == target_rashi:
        search_jd = after_jd
        for _ in range(max_days):
            search_jd = civil_day_add(search_jd, -1)
            if get_sun_rashi_at_jd(search_jd) == prev_rashi:
                low, high = search_jd, after_jd
                break
        else:
            return None
    elif current_rashi == prev_rashi:
        search_jd = after_jd
        for _ in range(max_days):
            search_jd = civil_day_add(search_jd, 1)
            if get_sun_rashi_at_jd(search_jd) == target_rashi:
                low, high = after_jd, search_jd
                break
        else:
            return None
    else:
        search_jd = after_jd
        found_prev: float | None = None
        for _ in range(max_days * 12):
            search_jd = civil_day_add(search_jd, 1)
            rashi = get_sun_rashi_at_jd(search_jd)
            if rashi == prev_rashi:
                found_prev = search_jd
            elif rashi == target_rashi and found_prev is not None:
                low, high = found_prev, search_jd
                break
        else:
            return None

    return find_sankranti_brent_jd(target_degree, low, high, tolerance_days=60 / 86400)


def _bisect_sankranti(
    target_degree: float, low: datetime, high: datetime, tolerance_seconds: int = 60
) -> datetime:
    tolerance = timedelta(seconds=tolerance_seconds)
    for _ in range(60):
        if high - low < tolerance:
            break
        mid = low + (high - low) / 2
        mid_err = _angular_error(sun_service.longitude(as_julian_day(mid), sidereal=True), target_degree)
        low_err = _angular_error(sun_service.longitude(as_julian_day(low), sidereal=True), target_degree)
        if low_err == 0:
            return low
        if mid_err == 0:
            return mid
        if low_err * mid_err <= 0:
            high = mid
        else:
            low = mid
    return high


def find_sankranti_brent(
    target_degree: float,
    low: datetime,
    high: datetime,
    tolerance_seconds: int = 60,
    max_iterations: int = 50,
) -> datetime:
    tol = float(tolerance_seconds)
    a = _to_unix_seconds(low)
    b = _to_unix_seconds(high)

    def f(ts: float) -> float:
        return _angular_error(sun_service.longitude(as_julian_day(_from_unix_seconds(ts)), sidereal=True), target_degree)

    fa, fb = f(a), f(b)
    if fa == 0:
        return _from_unix_seconds(a)
    if fb == 0:
        return _from_unix_seconds(b)
    if fa * fb > 0:
        return _bisect_sankranti(target_degree, low, high, tolerance_seconds=tolerance_seconds)

    if abs(fa) < abs(fb):
        a, b = b, a
        fa, fb = fb, fa

    c, fc, d = a, fa, a
    mflag = True

    for _ in range(max_iterations):
        if abs(b - a) <= tol or fb == 0:
            return _from_unix_seconds(b)
        if fa != fc and fb != fc:
            s = (
                (a * fb * fc) / ((fa - fb) * (fa - fc))
                + (b * fa * fc) / ((fb - fa) * (fb - fc))
                + (c * fa * fb) / ((fc - fa) * (fc - fb))
            )
        else:
            s = b - fb * (b - a) / (fb - fa)

        cond1 = not (min((3 * a + b) / 4, b) < s < max((3 * a + b) / 4, b))
        cond2 = mflag and abs(s - b) >= abs(b - c) / 2
        cond3 = (not mflag) and abs(s - b) >= abs(c - d) / 2
        cond4 = mflag and abs(b - c) < tol
        cond5 = (not mflag) and abs(c - d) < tol

        if cond1 or cond2 or cond3 or cond4 or cond5:
            s = (a + b) / 2
            mflag = True
        else:
            mflag = False

        fs = f(s)
        d, c = c, b
        fc = fb
        if fa * fs < 0:
            b, fb = s, fs
        else:
            a, fa = s, fs
        if abs(fa) < abs(fb):
            a, b = b, a
            fa, fb = fb, fa

    return _from_unix_seconds(b)


def find_sankranti(target_rashi: int, after: datetime, max_days: int = 40) -> Optional[datetime]:
    target_degree = target_rashi * 30
    prev_rashi = (target_rashi - 1) % 12
    current_rashi = get_sun_rashi_at_time(after)

    if current_rashi == target_rashi:
        search_point = after
        for _ in range(max_days):
            search_point -= timedelta(days=1)
            if get_sun_rashi_at_time(search_point) == prev_rashi:
                low, high = search_point, after
                break
        else:
            return None
    elif current_rashi == prev_rashi:
        search_point = after
        for _ in range(max_days):
            search_point += timedelta(days=1)
            if get_sun_rashi_at_time(search_point) == target_rashi:
                low, high = after, search_point
                break
        else:
            return None
    else:
        search_point = after
        found_prev = None
        for _ in range(max_days * 12):
            search_point += timedelta(days=1)
            rashi = get_sun_rashi_at_time(search_point)
            if rashi == prev_rashi:
                found_prev = search_point
            elif rashi == target_rashi and found_prev is not None:
                low, high = found_prev, search_point
                break
        else:
            return None

    return find_sankranti_brent(target_degree, low, high, tolerance_seconds=60)


def find_mesh_sankranti(year: int) -> Optional[datetime]:
    # ``day_instant_utc`` rather than ``datetime(...)`` so BCE search years work.
    return find_sankranti(0, day_instant_utc(CivilDay(year, 4, 1)), max_days=30)


def find_makara_sankranti(year: int) -> Optional[datetime]:
    return find_sankranti(9, day_instant_utc(CivilDay(year, 1, 1)), max_days=30)
