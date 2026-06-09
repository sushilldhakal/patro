"""Lunar month windows and festival date lookup (Purnimant + festival masa)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.adhik_maas import find_amavasya, find_purnima, is_adhik_maas
from panchanga.bikram_sambat import (
    get_bs_month_length,
    get_bs_month_start,
    gregorian_to_bs,
)
from panchanga.bs_year import bs_solar_year_for_gregorian_year
from panchanga.constants import BS_MONTH_NAMES
from panchanga.sankranti import find_sankranti, get_sun_rashi_at_time
from panchanga.tithi import get_udaya_tithi
from panchanga.tithi_boundaries import find_next_tithi

MonthModel = Literal["amanta", "purnimant", "festival"]

# MoHA patro: when Shrawan civil Purnima falls early in the month, observance
# shifts to the next civil month (Bhadau) — common in Adhik years.
_SHRAWAN_CIVIL_PURNIMA_MIN_DAY = 20


@dataclass
class LunarMonth:
    start_amavasya: datetime
    end_purnima: datetime
    end_amavasya: datetime
    month_name: str
    month_index: int
    is_adhik: bool
    sun_rashi_at_purnima: int
    sankranti_date: Optional[datetime] = None

    @property
    def full_name(self) -> str:
        return f"Adhik {self.month_name}" if self.is_adhik else self.month_name


@dataclass
class PurnimantMonth:
    """Purnimant window: day after previous Purnima through this Purnima."""

    start: date
    end_purnima: date
    start_dt: datetime
    end_dt: datetime
    solar_name: str
    festival_masa: str
    is_adhik: bool

    @property
    def full_name(self) -> str:
        return f"Adhik {self.festival_masa}" if self.is_adhik else self.festival_masa


@dataclass
class LunarYear:
    gregorian_year: int
    bs_year: int
    months: list[LunarMonth]
    has_adhik: bool
    adhik_month_name: Optional[str] = None


def name_lunar_month(start_amavasya: datetime, end_amavasya: datetime) -> str:
    """Name a lunar month using Sun's rashi at the month's Purnima."""
    search_start = start_amavasya + timedelta(days=2)
    purnima = find_purnima(search_start)
    if purnima is None or purnima >= end_amavasya:
        midpoint = start_amavasya + (end_amavasya - start_amavasya) / 2
        purnima = find_purnima(midpoint - timedelta(days=3)) or midpoint

    sun_rashi = get_sun_rashi_at_time(purnima)
    return BS_MONTH_NAMES[sun_rashi]


def compute_lunar_month(start_amavasya: datetime) -> LunarMonth:
    purnima = find_purnima(start_amavasya + timedelta(days=2))
    if purnima is None:
        raise ValueError(f"Could not find Purnima after {start_amavasya}")

    next_amavasya = find_amavasya(purnima + timedelta(days=2))
    if next_amavasya is None:
        raise ValueError(f"Could not find Amavasya after {purnima}")

    sun_rashi = get_sun_rashi_at_time(purnima)
    month_name = name_lunar_month(start_amavasya, next_amavasya)
    is_adhik = is_adhik_maas(start_amavasya, next_amavasya)

    sankranti = None
    for target_rashi in range(12):
        candidate = find_sankranti(target_rashi, start_amavasya, max_days=35)
        if candidate and start_amavasya <= candidate < next_amavasya:
            sankranti = candidate
            break

    return LunarMonth(
        start_amavasya=start_amavasya,
        end_purnima=purnima,
        end_amavasya=next_amavasya,
        month_name=month_name,
        month_index=(sun_rashi + 1) if sun_rashi < 12 else 1,
        is_adhik=is_adhik,
        sun_rashi_at_purnima=sun_rashi,
        sankranti_date=sankranti,
    )


def build_lunar_year(gregorian_year: int) -> LunarYear:
    search_start = datetime(gregorian_year, 2, 15, tzinfo=timezone.utc)
    first_amavasya = find_amavasya(search_start)
    if first_amavasya is None:
        raise ValueError(f"Could not find starting Amavasya for {gregorian_year}")

    months: list[LunarMonth] = []
    current_amavasya = first_amavasya
    for _ in range(14):
        try:
            month = compute_lunar_month(current_amavasya)
            months.append(month)
            current_amavasya = month.end_amavasya
            if current_amavasya.year > gregorian_year + 1:
                break
        except ValueError:
            break

    has_adhik = any(m.is_adhik for m in months)
    adhik_name = next((m.month_name for m in months if m.is_adhik), None)
    bs_year = gregorian_year + 56 if first_amavasya.month < 4 else gregorian_year + 57

    return LunarYear(
        gregorian_year=gregorian_year,
        bs_year=bs_year,
        months=months,
        has_adhik=has_adhik,
        adhik_month_name=adhik_name,
    )


_lunar_year_cache: dict[int, LunarYear] = {}


def get_lunar_year(gregorian_year: int) -> LunarYear:
    if gregorian_year not in _lunar_year_cache:
        _lunar_year_cache[gregorian_year] = build_lunar_year(gregorian_year)
    return _lunar_year_cache[gregorian_year]


def clear_lunar_year_cache() -> None:
    _lunar_year_cache.clear()


def _shift_masa_name(name: str, offset: int) -> str:
    if name not in BS_MONTH_NAMES:
        return name
    index = (BS_MONTH_NAMES.index(name) - offset) % 12
    return BS_MONTH_NAMES[index]


def build_purnimant_months(
    lunar_year: LunarYear,
    *,
    adhik_policy: Literal["skip", "use_adhik", "both"] = "skip",
) -> list[PurnimantMonth]:
    """Purnimant windows with festival masa labels (adhik-aware lag)."""
    windows: list[PurnimantMonth] = []
    prev_purnima: datetime | None = None
    adhik_before = 0

    for month in lunar_year.months:
        start_dt = (
            prev_purnima + timedelta(days=1)
            if prev_purnima is not None
            else month.start_amavasya
        )
        if month.is_adhik:
            if adhik_policy != "use_adhik":
                adhik_before += 1
            windows.append(
                PurnimantMonth(
                    start=start_dt.date(),
                    end_purnima=month.end_purnima.date(),
                    start_dt=start_dt,
                    end_dt=month.end_purnima,
                    solar_name=month.month_name,
                    festival_masa=month.month_name,
                    is_adhik=True,
                )
            )
        else:
            festival_masa = _shift_masa_name(month.month_name, adhik_before)
            windows.append(
                PurnimantMonth(
                    start=start_dt.date(),
                    end_purnima=month.end_purnima.date(),
                    start_dt=start_dt,
                    end_dt=month.end_purnima,
                    solar_name=month.month_name,
                    festival_masa=festival_masa,
                    is_adhik=False,
                )
            )
        prev_purnima = month.end_purnima

    return windows


def _lunar_month_payload(
    name: str | None,
    *,
    full_name: str | None = None,
    is_adhik: bool = False,
    month_type: str = "nija",
    paksha_model: MonthModel = "amanta",
    window_start: date | None = None,
    window_end: date | None = None,
    solar_name: str | None = None,
    festival_masa: str | None = None,
) -> dict:
    return {
        "name": name,
        "full_name": full_name or name,
        "is_adhik": is_adhik,
        "type": month_type,
        "paksha_model": paksha_model,
        "window_start": window_start.isoformat() if window_start else None,
        "window_end": window_end.isoformat() if window_end else None,
        "solar_name": solar_name,
        "festival_masa": festival_masa,
    }


def _find_amanta_month_for_date(target: date) -> dict:
    check = datetime.combine(target, datetime.min.time().replace(hour=12), tzinfo=timezone.utc)
    for gregorian_year in (target.year - 1, target.year, target.year + 1):
        lunar_year = get_lunar_year(gregorian_year)
        for month in lunar_year.months:
            if month.start_amavasya <= check < month.end_amavasya:
                return _lunar_month_payload(
                    month.month_name,
                    full_name=month.full_name,
                    is_adhik=month.is_adhik,
                    month_type="adhik" if month.is_adhik else "nija",
                    paksha_model="amanta",
                    window_start=month.start_amavasya.date(),
                    window_end=(month.end_amavasya - timedelta(days=1)).date(),
                    solar_name=month.month_name,
                    festival_masa=month.month_name,
                )
    return _lunar_month_payload(None, month_type="unknown", paksha_model="amanta")


def _find_purnimant_month_for_date(target: date, *, festival_masa: bool = False) -> dict:
    for gregorian_year in (target.year - 1, target.year, target.year + 1):
        lunar_year = get_lunar_year(gregorian_year)
        for window in build_purnimant_months(lunar_year):
            label = window.festival_masa if festival_masa else window.solar_name
            if window.start <= target <= window.end_purnima:
                return _lunar_month_payload(
                    label,
                    full_name=window.full_name if festival_masa else (
                        f"Adhik {window.solar_name}" if window.is_adhik else window.solar_name
                    ),
                    is_adhik=window.is_adhik,
                    month_type="adhik" if window.is_adhik else "nija",
                    paksha_model="festival" if festival_masa else "purnimant",
                    window_start=window.start,
                    window_end=window.end_purnima,
                    solar_name=window.solar_name,
                    festival_masa=window.festival_masa,
                )
    return _lunar_month_payload(None, month_type="unknown", paksha_model="purnimant")


def get_lunar_month_for_date(
    target: date,
    *,
    month_model: MonthModel = "amanta",
) -> dict:
    """Return lunar month identity for a Gregorian civil date."""
    if month_model == "amanta":
        return _find_amanta_month_for_date(target)
    if month_model == "purnimant":
        return _find_purnimant_month_for_date(target, festival_masa=False)
    return _find_purnimant_month_for_date(target, festival_masa=True)


def get_lunar_calendar_layers(target: date) -> dict:
    """Expose amanta, purnimant (solar), and festival masa layers for one day."""
    lunar_year = get_lunar_year(target.year)
    return {
        "adhik_maas": {
            "year_has_adhik": lunar_year.has_adhik,
            "name": lunar_year.adhik_month_name,
            "name_ne": (
                f"अधिक {lunar_year.adhik_month_name}"
                if lunar_year.adhik_month_name
                else None
            ),
        },
        "amanta": get_lunar_month_for_date(target, month_model="amanta"),
        "purnimant": get_lunar_month_for_date(target, month_model="purnimant"),
        "festival_masa": get_lunar_month_for_date(target, month_model="festival"),
    }


def _bs_month_index(lunar_month_name: str) -> Optional[int]:
    try:
        return BS_MONTH_NAMES.index(lunar_month_name) + 1
    except ValueError:
        return None


def _find_bs_civil_purnima(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation,
) -> Optional[date]:
    """Udaya-confirmed Shukla Purnima within a Bikram Sambat civil month."""
    try:
        month_start = get_bs_month_start(bs_year, bs_month)
        month_length = get_bs_month_length(bs_year, bs_month)
    except ValueError:
        return None

    for offset in range(month_length):
        candidate = month_start + timedelta(days=offset)
        try:
            udaya = get_udaya_tithi(candidate, location)
        except (RuntimeError, TypeError, ValueError):
            continue
        if udaya["tithi"] == 15 and udaya["paksha"] == "shukla":
            return candidate
    return None


def _resolve_shrawan_purnima_by_bs_civil(
    gregorian_year: int,
    location: ObserverLocation,
) -> Optional[date]:
    """
    MoHA-style Shrawan Purnima: civil BS Purnima in Shrawan unless it falls
    before day 20, in which case use Bhadau civil Purnima (Adhik lag case).
    """
    bs_year = bs_solar_year_for_gregorian_year(gregorian_year, 4)
    shrawan = _find_bs_civil_purnima(bs_year, 4, location)
    bhadau = _find_bs_civil_purnima(bs_year, 5, location)

    if shrawan is not None:
        _, _, bs_day = gregorian_to_bs(shrawan)
        if bs_day >= _SHRAWAN_CIVIL_PURNIMA_MIN_DAY and shrawan.year == gregorian_year:
            return shrawan
    if bhadau is not None and bhadau.year == gregorian_year:
        return bhadau
    return None


def _purnimant_month_to_lunar_month(window: PurnimantMonth) -> LunarMonth:
    """Adapter so purnimant windows reuse amanta tithi search helpers.

    In a purnimant month the Krishna Paksha runs from the window start (day
    after the previous Purnima) through to the Amavasya, and the Shukla
    Paksha runs from the Amavasya to the current Purnima.

    _boundary_tithi_date_in_month uses end_purnima as the krishna-search
    start and start_amavasya as the shukla-search start.  Both need to point
    to the *beginning* of the purnimant window so that Krishna-paksha tithis
    (which precede the Purnima) are found within the correct 35-day scan.
    """
    return LunarMonth(
        start_amavasya=window.start_dt,
        end_purnima=window.start_dt,           # krishna search starts at window open
        end_amavasya=window.end_dt + timedelta(days=1),
        month_name=window.festival_masa,
        month_index=1,
        is_adhik=window.is_adhik,
        sun_rashi_at_purnima=0,
    )


def find_festival_in_lunar_month(
    lunar_month_name: str,
    tithi: int,
    paksha: str,
    gregorian_year: int,
    adhik_policy: Literal["skip", "use_adhik", "both"] = "skip",
    date_selection: Literal["udaya", "boundary"] = "udaya",
    location: ObserverLocation = DEFAULT_LOCATION,
    month_model: MonthModel = "festival",
) -> Optional[date]:
    if (
        month_model == "festival"
        and lunar_month_name == "Shrawan"
        and tithi == 15
        and paksha == "shukla"
    ):
        civil = _resolve_shrawan_purnima_by_bs_civil(gregorian_year, location)
        if civil is not None:
            return civil

    if month_model in ("purnimant", "festival"):
        return _find_festival_in_purnimant(
            lunar_month_name=lunar_month_name,
            tithi=tithi,
            paksha=paksha,
            gregorian_year=gregorian_year,
            adhik_policy=adhik_policy,
            date_selection=date_selection,
            location=location,
            use_festival_masa=month_model == "festival",
        )

    return _find_festival_in_amanta(
        lunar_month_name=lunar_month_name,
        tithi=tithi,
        paksha=paksha,
        gregorian_year=gregorian_year,
        adhik_policy=adhik_policy,
        date_selection=date_selection,
        location=location,
    )


def _find_festival_in_purnimant(
    *,
    lunar_month_name: str,
    tithi: int,
    paksha: str,
    gregorian_year: int,
    adhik_policy: Literal["skip", "use_adhik", "both"],
    date_selection: Literal["udaya", "boundary"],
    location: ObserverLocation,
    use_festival_masa: bool,
) -> Optional[date]:
    candidates: list[tuple[date, bool]] = []

    for search_year in (gregorian_year - 1, gregorian_year):
        lunar_year = get_lunar_year(search_year)
        windows = build_purnimant_months(lunar_year, adhik_policy=adhik_policy)
        label_key = "festival_masa" if use_festival_masa else "solar_name"
        matching = [w for w in windows if getattr(w, label_key) == lunar_month_name]

        for window in matching:
            if adhik_policy == "skip" and window.is_adhik:
                continue
            if adhik_policy == "use_adhik" and not window.is_adhik:
                if any(w.is_adhik and getattr(w, label_key) == lunar_month_name for w in windows):
                    continue

            month = _purnimant_month_to_lunar_month(window)
            if date_selection == "boundary":
                boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
                if boundary:
                    candidates.append((boundary, False))
                continue

            exact = _search_tithi_in_month(month, tithi, paksha, location)
            if exact:
                candidates.append((exact, True))
                continue

            boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
            if boundary:
                candidates.append((boundary, False))

    if not candidates:
        return None
    return min(candidates, key=_candidate_rank(gregorian_year))[0]


def _find_festival_in_amanta(
    *,
    lunar_month_name: str,
    tithi: int,
    paksha: str,
    gregorian_year: int,
    adhik_policy: Literal["skip", "use_adhik", "both"],
    date_selection: Literal["udaya", "boundary"],
    location: ObserverLocation,
) -> Optional[date]:
    candidates: list[tuple[date, bool]] = []

    for search_year in (gregorian_year - 1, gregorian_year):
        lunar_year = get_lunar_year(search_year)
        matching_months = [m for m in lunar_year.months if m.month_name == lunar_month_name]

        for month in matching_months:
            if adhik_policy == "skip" and month.is_adhik:
                continue
            if adhik_policy == "use_adhik" and not month.is_adhik:
                if any(m.is_adhik for m in matching_months):
                    continue

            if date_selection == "boundary":
                boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
                if boundary:
                    candidates.append((boundary, False))
                continue

            exact = _search_tithi_in_month(month, tithi, paksha, location)
            if exact:
                candidates.append((exact, True))
                continue

            boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
            if boundary:
                candidates.append((boundary, False))

    if not candidates:
        return None
    return min(candidates, key=_candidate_rank(gregorian_year))[0]


def _candidate_rank(gregorian_year: int):
    def _rank(item: tuple[date, bool]) -> tuple[int, int, int, int, date]:
        result_date, exact = item
        return (
            0 if result_date.year == gregorian_year else 1,
            abs(result_date.year - gregorian_year),
            0 if result_date.year >= gregorian_year else 1,
            0 if exact else 1,
            result_date,
        )

    return _rank


def _boundary_tithi_date_in_month(month: LunarMonth, tithi: int, paksha: str) -> Optional[date]:
    search_start = month.start_amavasya if paksha == "shukla" else month.end_purnima
    search_end = month.end_amavasya
    tithi_datetime = find_next_tithi(tithi, paksha, search_start, within_days=35)
    if tithi_datetime is None:
        return None
    if paksha == "krishna" and tithi == 15:
        if not (search_start <= tithi_datetime <= month.end_amavasya + timedelta(hours=24)):
            return None
    elif not (search_start <= tithi_datetime < search_end):
        return None
    return tithi_datetime.date()


def _search_tithi_in_month(
    month: LunarMonth,
    tithi: int,
    paksha: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    candidate_date = _boundary_tithi_date_in_month(month, tithi, paksha)
    if candidate_date is None:
        return None

    for offset in range(5):
        check_date = candidate_date + timedelta(days=offset - 1)
        try:
            udaya = get_udaya_tithi(check_date, location)
            if udaya["tithi"] == tithi and udaya["paksha"] == paksha:
                return check_date
        except (RuntimeError, TypeError, ValueError):
            continue
    return None
