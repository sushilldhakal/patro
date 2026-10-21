"""Nepal Sambat (नेपाल सम्बत) — lunar calendar conversion."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import bs_year_date_range
from engine.vedic.lunar_month import find_festival_in_lunar_month

BS_TO_NS_OFFSET = 937

NS_MONTH_NAMES_NE = [
    "कछला", "थिन्ला", "पोहेला", "सिल्ला", "चिल्ला", "चौला",
    "बछला", "तछला", "दिल्ला", "गुँला", "ञला", "कौला",
]

# Adhik maas Newari paksha names (अनालाथ्व / अनालागा)
NS_ADHIK_PAKSHA_NE = {
    "shukla": "अनालाथ्व",
    "krishna": "अनालागा",
}

# Nepal Sambat months are amānta and begin with Kachhalā, the amānta Kartik
# (its new year is Kartik Shukla Pratipada): amānta month name → its index in
# NS_MONTH_NAMES_NE. Laxmi Puja, the amānta Ashwin Amavasya, is Kaulā Āmāi.
NS_MONTH_OF_AMANTA = {
    "Kartik": 0, "Mangsir": 1, "Poush": 2, "Magh": 3, "Falgun": 4, "Chaitra": 5,
    "Baishakh": 6, "Jestha": 7, "Ashadh": 8, "Shrawan": 9, "Bhadra": 10, "Ashwin": 11,
}

# Regular-month Newari krishna-paksha name (…लागा), keyed by the *amānta*
# month — the one ``merge_lunar_month_for_day`` names. Amānta Ashwin's dark
# half (Tihar) is कौलागा; pūrṇimānta reckoning would call it Kartik's.
NS_KRISHNA_PAKSHA_NE = {
    month: f"{NS_MONTH_NAMES_NE[index]}गा" for month, index in NS_MONTH_OF_AMANTA.items()
}


def find_ns_new_year(bs_year: int, location: ObserverLocation = DEFAULT_LOCATION) -> date:
    """Gregorian date of Kartik Shukla Pratipada — Nepal Sambat new year."""
    year_start, year_end = bs_year_date_range(bs_year)
    for greg_year in range(year_start.year, year_end.year + 1):
        candidate = find_festival_in_lunar_month(
            "Kartik", 1, "shukla", greg_year, location=location
        )
        if candidate and year_start <= candidate <= year_end:
            return candidate
    raise ValueError(f"Could not find Nepal Sambat new year for BS {bs_year}")


def _ns_paksha_label(
    paksha: str,
    lunar_month_name: str | None,
    *,
    is_adhik: bool,
    tithi_name_ne: str,
    tithi_absolute: int,
) -> dict:
    if is_adhik:
        paksha_ne = NS_ADHIK_PAKSHA_NE[paksha]
    elif paksha == "krishna" and lunar_month_name:
        paksha_ne = NS_KRISHNA_PAKSHA_NE.get(lunar_month_name, "कृष्ण पक्ष")
    else:
        from engine.vedic.names_ne import PAKSHA_NAMES_NE

        paksha_ne = PAKSHA_NAMES_NE[paksha]

    return {
        "paksha": paksha,
        "paksha_ne": paksha_ne,
        "label_ne": f"{paksha_ne} {tithi_name_ne} - {tithi_absolute}",
    }


def gregorian_to_ns(
    greg: date,
    bs_year: int,
    *,
    tithi_display: int,
    tithi_absolute: int,
    tithi_name_ne: str,
    paksha: str,
    lunar_month_name: str | None,
    is_adhik: bool = False,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict:
    """Map a Gregorian date to Nepal Sambat year, lunar month, and tithi day."""
    ns_new_year = find_ns_new_year(bs_year, location)
    ns_year = bs_year - BS_TO_NS_OFFSET

    month_name = lunar_month_name or "Unknown"
    month_index = None
    if lunar_month_name:
        from engine.vedic.sankranti import BS_MONTH_NAMES

        try:
            month_index = BS_MONTH_NAMES.index(lunar_month_name) + 1
        except ValueError:
            pass

    paksha_info = _ns_paksha_label(
        paksha,
        lunar_month_name,
        is_adhik=is_adhik,
        tithi_name_ne=tithi_name_ne,
        tithi_absolute=tithi_absolute,
    )

    return {
        "year": ns_year,
        "month": month_name,
        "month_index": month_index,
        "month_name_ne": (
            NS_MONTH_NAMES_NE[NS_MONTH_OF_AMANTA[lunar_month_name]]
            if lunar_month_name in NS_MONTH_OF_AMANTA
            else None
        ),
        "day": tithi_display,
        "tithi_absolute": tithi_absolute,
        "paksha": paksha,
        "paksha_ne": paksha_info["paksha_ne"],
        "label_ne": paksha_info["label_ne"],
        "new_year": ns_new_year.isoformat(),
        "is_before_new_year": greg < ns_new_year,
    }
