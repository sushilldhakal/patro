from fastapi import APIRouter

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    from engine.astronomy.engine import default_engine
    from engine.astronomy.paths import cities_db_path
    from services.panchanga_cache import cache_stats

    return {
        "status": "ok",
        "cities_db": cities_db_path().is_file(),
        "panchanga_cache": cache_stats(),
        "astronomy_memo": default_engine.cache_info(),
    }


@router.get("/about")
def about():
    return {
        "name": "Surya Panchanga API",
        "version": "2.2.0",
        "repository": "https://github.com/sushilldhakal/patro",
        "calculation_engine": {
            "framework": "Surya Siddhanta (ancient) + drik (modern precise) algorithms",
            "ephemeris": "JPL (NASA's Jet Propulsion Laboratory) — true sidereal Sun/Moon longitudes",
            "ayanamsa": "Lahiri (Chitrapaksha) — standard for Nepali panchanga",
            "sunrise_model": "Geometric horizon, atmospheric refraction 0.5667°",
            "udaya_tithi": "Tithi at local sunrise is used for festival assignment (traditional Nepali panchanga practice)",
        },
        "panchangas": [
            {"name": "Tithi", "name_ne": "तिथि", "division": "12°",
             "description": "Lunar day — the angular separation between Moon and Sun divided by 12°."},
            {"name": "Nakshatra", "name_ne": "नक्षत्र", "division": "13°20′",
             "description": "Lunar mansion — the ecliptic divided into 27 equal segments of 13°20′."},
            {"name": "Yoga", "name_ne": "योग", "division": "13°20′",
             "description": "Sum of the Sun's and Moon's sidereal longitudes divided into 27 equal segments."},
            {"name": "Karana", "name_ne": "करण", "division": "6°",
             "description": "Half-tithi — the angular separation divided by 6°."},
            {"name": "Vaara", "name_ne": "वार", "division": None,
             "description": "Day of the week counted from local sunrise."},
        ],
        "special_months": {
            "adhik_maas": {
                "description": "Extra intercalary lunar month when NO Sankranti falls within a lunar month.",
                "frequency": "Every 32–33 months",
            },
            "kshaya_maas": {
                "description": "Extremely rare 'lost' lunar month when TWO Sankrantis fall within a single lunar month.",
                "frequency": "Approximately once every 141 years",
                "last_occurrence": "BS 2020 (1963 CE)",
                "next_predicted": "BS 2198 (2141 CE)",
            },
        },
    }
