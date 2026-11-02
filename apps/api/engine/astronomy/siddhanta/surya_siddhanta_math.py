"""सूर्य सिद्धान्त — graha positions computed the way the Surya Siddhanta prescribes.

Pure arithmetic, no ephemeris files and no ΔT: the text's own model, followed as
written (Burgess's translation, chapters I–III), so it answers for any day of the
current mahayuga — back to the start of सत्य युग and beyond.

How a position is found
-----------------------
1. **Ahargana** — civil days elapsed since the moment the text counts from. The
   Kali Yuga began at midnight on the Lanka/Ujjain meridian at the start of
   18 Feb 3102 BCE (Julian), JD 588465.5 for 0h UT of that date; Ujjain lies at
   75°46′ E, so its midnight was 75°46′/360° of a day earlier in UT. Planetary
   motion had then run for 1,955,880,000 years (6 manus, 7 sandhis, 27 mahayugas
   and the सत्य, त्रेता and द्वापर of the 28th, less the 17,064,000 years of
   creation), which is 452.75 mahayugas of 1,577,917,828 civil days each.
2. **Mean longitude** — revolutions per mahayuga (or per kalpa, for apsides and
   nodes) × days ÷ days per mahayuga, kept exact with integers: the day count is
   ~7×10¹¹ and a float would lose the Moon's position entirely.
3. **True longitude** — the Sun and Moon take the manda (equation of centre)
   correction; the five star-planets take the four-step manda + शीघ्र procedure
   of chapter II. Epicycles shrink from their even-quadrant to their
   odd-quadrant size with |sin anomaly|, as the text gives them.
4. **Ayanamsha** — the libration of the equinox: 600 revolutions per mahayuga,
   the bhuja of the revolution's arc × 3/10, so it swings ±27°.

Positions are निरयण (sidereal) by construction; sayana ones add the ayanamsha.
"""

from __future__ import annotations

import math
from typing import Any

# ── the yuga frame ──────────────────────────────────────────────────────────

MAHAYUGA_YEARS = 4_320_000
#: Civil (savana) days in a mahayuga.
MAHAYUGA_DAYS = 1_577_917_828
KALPA_DAYS = 1000 * MAHAYUGA_DAYS
#: Days of planetary motion from creation to the start of Kali Yuga (452.75 mahayugas).
DAYS_CREATION_TO_KALI = MAHAYUGA_DAYS * 45_275 // 100
#: JD (UT) of 0h on 18 Feb 3102 BCE (Julian) and Ujjain's longitude.
KALI_JD_0H_UT = 588465.5
UJJAIN_LONGITUDE = 75.0 + 46.0 / 60.0
#: JD (UT) of the Kali epoch: midnight on the Ujjain meridian.
KALI_EPOCH_JD = KALI_JD_0H_UT - UJJAIN_LONGITUDE / 360.0
#: One sidereal-solar year of the text, in days.
YEAR_DAYS = MAHAYUGA_DAYS / MAHAYUGA_YEARS

#: सत्य + त्रेता + द्वापर of this mahayuga, in years, before Kali.
YEARS_SATYA_TO_KALI = 1_728_000 + 1_296_000 + 864_000
#: JD of the start of this mahayuga's सत्य युग — the earliest day the app offers.
SATYA_YUGA_START_JD = KALI_EPOCH_JD - YEARS_SATYA_TO_KALI * YEAR_DAYS

# ── revolutions (Burgess I.29–44) ───────────────────────────────────────────

#: Revolutions per mahayuga of the mean planets (Mercury and Venus: their शीघ्रोच्च).
REVS_MAHAYUGA = {
    "sun": 4_320_000,
    "moon": 57_753_336,
    "mars": 2_296_832,
    "mercury_sighra": 17_937_060,
    "jupiter": 364_220,
    "venus_sighra": 7_022_376,
    "saturn": 146_568,
    "moon_apogee": 488_203,
    "moon_node": -232_238,  # retrograde
}

#: Revolutions per kalpa of the apsides (मन्दोच्च) and nodes (पात, retrograde).
APSIS_REVS_KALPA = {"sun": 387, "mars": 204, "mercury": 368, "jupiter": 900, "venus": 535, "saturn": 39}
NODE_REVS_KALPA = {"mars": -214, "mercury": -488, "jupiter": -174, "venus": -903, "saturn": -662}

#: Epicycle circumferences in degrees: (end of even quadrant, end of odd quadrant).
MANDA_EPICYCLE = {
    "sun": (14.0, 13.0 + 40.0 / 60.0),
    "moon": (32.0, 31.0 + 40.0 / 60.0),
    "mars": (75.0, 72.0),
    "mercury": (30.0, 28.0),
    "jupiter": (33.0, 32.0),
    "venus": (12.0, 11.0),
    "saturn": (49.0, 48.0),
}
SIGHRA_EPICYCLE = {
    "mars": (235.0, 232.0),
    "mercury": (133.0, 132.0),
    "jupiter": (70.0, 72.0),
    "venus": (262.0, 260.0),
    "saturn": (39.0, 40.0),
}

#: Greatest latitudes (Burgess I.68–70), degrees.
MAX_LATITUDE = {"moon": 4.5, "mars": 1.5, "mercury": 2.0, "jupiter": 1.0, "venus": 2.0, "saturn": 2.0}

#: Obliquity of the ecliptic (Burgess II.28): 24°.
OBLIQUITY = 24.0
#: Revolutions of the equinox's libration per mahayuga, and its amplitude.
AYANA_REVS_MAHAYUGA = 600
AYANA_AMPLITUDE = 27.0

STAR_PLANETS = ("mars", "mercury", "jupiter", "venus", "saturn")
BODIES = ("sun", "moon", *STAR_PLANETS, "rahu")


def _wrap(deg: float) -> float:
    return deg % 360.0


def _signed(deg: float) -> float:
    """Into (−180, 180]."""
    d = deg % 360.0
    return d - 360.0 if d > 180.0 else d


def ahargana(jd_ut: float) -> float:
    """Civil days since the Kali epoch (negative before it)."""
    return jd_ut - KALI_EPOCH_JD


def _revolution_fraction(revs: int, period_days: int, jd_ut: float) -> float:
    """Fractional revolution after the days of motion up to *jd_ut*, exactly.

    The whole days go through integer arithmetic (the count is ~7×10¹¹); only
    the fraction of the current day is a float.
    """
    days = DAYS_CREATION_TO_KALI + ahargana(jd_ut)
    whole = math.floor(days)
    part = days - whole
    numerator = (revs * whole) % period_days
    return ((numerator + revs * part) / period_days) % 1.0


def mean_longitude(key: str, jd_ut: float) -> float:
    """Mean longitude (degrees) of a REVS_MAHAYUGA body."""
    return 360.0 * _revolution_fraction(REVS_MAHAYUGA[key], MAHAYUGA_DAYS, jd_ut)


def apsis_longitude(planet: str, jd_ut: float) -> float:
    if planet == "moon":
        return mean_longitude("moon_apogee", jd_ut)
    return 360.0 * _revolution_fraction(APSIS_REVS_KALPA[planet], KALPA_DAYS, jd_ut)


def node_longitude(planet: str, jd_ut: float) -> float:
    if planet == "moon":
        return mean_longitude("moon_node", jd_ut)
    return 360.0 * _revolution_fraction(NODE_REVS_KALPA[planet], KALPA_DAYS, jd_ut)


def _epicycle(sizes: tuple[float, float], anomaly: float) -> float:
    even, odd = sizes
    return even - (even - odd) * abs(math.sin(math.radians(anomaly)))


def manda_equation(planet: str, longitude: float, apsis: float) -> float:
    """Correction (degrees) to add: negative while the planet runs from its apsis to 180° past it."""
    anomaly = longitude - apsis
    c = _epicycle(MANDA_EPICYCLE[planet], anomaly)
    return -math.degrees(math.asin(c / 360.0 * math.sin(math.radians(anomaly))))


def sighra_equation(planet: str, longitude: float, sighrocca: float) -> tuple[float, float]:
    """(correction to add, शीघ्र कर्ण as a fraction of the radius)."""
    anomaly = sighrocca - longitude
    c = _epicycle(SIGHRA_EPICYCLE[planet], anomaly) / 360.0
    a = math.radians(anomaly)
    across, along = c * math.sin(a), 1.0 + c * math.cos(a)
    return math.degrees(math.atan2(across, along)), math.hypot(across, along)


def _star_planet(planet: str, jd_ut: float) -> tuple[float, float]:
    """(true longitude, latitude) of a star-planet by the four steps of chapter II."""
    sun = mean_longitude("sun", jd_ut)
    if planet in ("mercury", "venus"):
        mean, sighrocca = sun, mean_longitude(f"{planet}_sighra", jd_ut)
    else:
        mean, sighrocca = mean_longitude(planet, jd_ut), sun
    apsis = apsis_longitude(planet, jd_ut)
    p1 = mean + sighra_equation(planet, mean, sighrocca)[0] / 2.0
    p2 = p1 + manda_equation(planet, p1, apsis) / 2.0
    p3 = mean + manda_equation(planet, p2, apsis)
    sighra, karna = sighra_equation(planet, p3, sighrocca)
    true = _wrap(p3 + sighra)
    # Latitude: from the manda planet (superior) or the शीघ्रोच्च (inferior), scaled by the कर्ण.
    argument = (sighrocca if planet in ("mercury", "venus") else p3) - node_longitude(planet, jd_ut)
    latitude = MAX_LATITUDE[planet] * math.sin(math.radians(argument)) / karna
    return true, latitude


def mean_sign_ingresses_since_kali(key: str, jd_ut: float) -> int:
    """Whole signs a mean planet has entered since the Kali epoch (negative before it).

    For Jupiter this is the count of बार्हस्पत्य years, which is what advances the
    60-year samvatsara cycle.
    """
    days = ahargana(jd_ut)
    whole = math.floor(days)
    signs_per_day_numerator = 12 * REVS_MAHAYUGA[key]
    quotient, remainder = divmod(signs_per_day_numerator * whole, MAHAYUGA_DAYS)  # exact
    return quotient + math.floor((remainder + signs_per_day_numerator * (days - whole)) / MAHAYUGA_DAYS)


def true_position(body: str, jd_ut: float) -> tuple[float, float]:
    """(निरयण true longitude, latitude) in degrees. ``rahu`` is the mean ascending node."""
    if body == "sun":
        mean = mean_longitude("sun", jd_ut)
        return _wrap(mean + manda_equation("sun", mean, apsis_longitude("sun", jd_ut))), 0.0
    if body == "moon":
        mean = mean_longitude("moon", jd_ut)
        true = _wrap(mean + manda_equation("moon", mean, apsis_longitude("moon", jd_ut)))
        node = node_longitude("moon", jd_ut)
        return true, MAX_LATITUDE["moon"] * math.sin(math.radians(true - node))
    if body == "rahu":
        return node_longitude("moon", jd_ut), 0.0
    if body in STAR_PLANETS:
        return _star_planet(body, jd_ut)
    raise ValueError(f"Surya Siddhanta has no body {body!r}")


#: Half-width (days) of the central difference that gives speeds.
SPEED_HALF_STEP = 0.5


def true_longitude_and_speed(body: str, jd_ut: float) -> tuple[float, float]:
    lon = true_position(body, jd_ut)[0]
    ahead = true_position(body, jd_ut + SPEED_HALF_STEP)[0]
    behind = true_position(body, jd_ut - SPEED_HALF_STEP)[0]
    return lon, _signed(ahead - behind) / (2.0 * SPEED_HALF_STEP)


def ayanamsha(jd_ut: float) -> float:
    """अयनांश: sayana − nirayana, the libration of the equinox (±27°).

    Zero at the Kali epoch and again 3600 years later (~499 CE); negative between
    them, positive since — about +22.9° in 2026.
    """
    arc = 360.0 * _revolution_fraction(AYANA_REVS_MAHAYUGA, MAHAYUGA_DAYS, jd_ut)
    quadrant_arc = arc % 180.0
    bhuja = quadrant_arc if quadrant_arc <= 90.0 else 180.0 - quadrant_arc
    sign = -1.0 if arc < 180.0 else 1.0
    return sign * bhuja * AYANA_AMPLITUDE / 90.0


def equatorial(sayana_longitude: float, latitude: float = 0.0) -> tuple[float, float]:
    """(right ascension, declination) in degrees for the text's 24° obliquity."""
    lam, beta, eps = (math.radians(x) for x in (sayana_longitude, latitude, OBLIQUITY))
    ra = math.atan2(math.sin(lam) * math.cos(eps) - math.tan(beta) * math.sin(eps), math.cos(lam))
    dec = math.asin(math.sin(beta) * math.cos(eps) + math.cos(beta) * math.sin(eps) * math.sin(lam))
    return _wrap(math.degrees(ra)), math.degrees(dec)


def local_sidereal_degrees(jd_ut: float, longitude: float) -> float:
    """Local sidereal time as an angle: the mean Sun's sayana longitude + the mean-solar hour angle."""
    mean_sun = mean_longitude("sun", jd_ut) + ayanamsha(jd_ut)
    local_mean_days = jd_ut + longitude / 360.0 + 0.5
    return _wrap(mean_sun + 360.0 * (local_mean_days % 1.0) - 180.0)


def equation_of_time_days(jd_ut: float) -> float:
    """Apparent − mean solar time, in days."""
    mean_sun = mean_longitude("sun", jd_ut) + ayanamsha(jd_ut)
    ra, _ = equatorial(true_position("sun", jd_ut)[0] + ayanamsha(jd_ut))
    return _signed(mean_sun - ra) / 360.0


def altitude(body: str, jd_ut: float, latitude: float, longitude: float) -> float:
    """Geometric altitude (degrees) of a body's centre."""
    lon, lat = true_position(body, jd_ut)
    ra, dec = equatorial(lon + ayanamsha(jd_ut), lat)
    hour = math.radians(local_sidereal_degrees(jd_ut, longitude) - ra)
    phi, d = math.radians(latitude), math.radians(dec)
    return math.degrees(math.asin(math.sin(phi) * math.sin(d) + math.cos(phi) * math.cos(d) * math.cos(hour)))


#: Scan step and window for rise/set searches (days). The Moon can take ~25 h to rise again.
_SCAN_STEP = 1.0 / 48.0
_SCAN_WINDOW = 1.6


def next_rise_or_set(
    body: str, jd_start: float, latitude: float, longitude: float, *, rising: bool, horizon: float = 0.0
) -> float | None:
    """First JD (UT) after *jd_start* when the body's centre crosses *horizon*; None if it never does.

    The text takes rise and set at the centre on the true horizon, with no refraction.
    """
    def above(t: float) -> float:
        return altitude(body, t, latitude, longitude) - horizon

    t0, a0 = jd_start, above(jd_start)
    steps = int(_SCAN_WINDOW / _SCAN_STEP)
    for _ in range(steps):
        t1 = t0 + _SCAN_STEP
        a1 = above(t1)
        if (rising and a0 < 0.0 <= a1) or (not rising and a0 >= 0.0 > a1):
            lo, hi = t0, t1
            for _ in range(32):  # ~1 ms
                mid = (lo + hi) / 2.0
                if (above(mid) >= 0.0) == rising:
                    hi = mid
                else:
                    lo = mid
            return (lo + hi) / 2.0
        t0, a0 = t1, a1
    return None


def ascendant_sayana(jd_ut: float, latitude: float, longitude: float) -> float:
    """The rising point of the ecliptic (sayana), for the text's obliquity."""
    ramc = math.radians(local_sidereal_degrees(jd_ut, longitude))
    eps, phi = math.radians(OBLIQUITY), math.radians(latitude)
    asc = math.atan2(math.cos(ramc), -(math.sin(ramc) * math.cos(eps) + math.tan(phi) * math.sin(eps)))
    return _wrap(math.degrees(asc))


def ascendant(jd_ut: float, latitude: float, longitude: float) -> float:
    """लग्न (निरयण)."""
    return _wrap(ascendant_sayana(jd_ut, latitude, longitude) - ayanamsha(jd_ut))


# ── Eclipses (Burgess, chapters IV and V) ────────────────────────────────────
#
# Lunar (ch. IV): at the opposition the Moon's disc and the Earth's shadow are
# measured in minutes; the Moon's latitude against half their sum says whether,
# and how much, she is eclipsed, and the half-durations follow from it.
# Solar (ch. V): the same at the conjunction, but seen from the observer, so the
# Moon's parallax in longitude (लम्बन) moves the middle of the eclipse and its
# parallax in latitude (नति) moves her latitude.

#: Diameters in yojanas (IV.1, I.59) and orbits in yojanas (XII.80–90).
SUN_DIAMETER_YOJANAS = 6500.0
MOON_DIAMETER_YOJANAS = 480.0
EARTH_DIAMETER_YOJANAS = 1600.0
MOON_ORBIT_YOJANAS = 324_000.0
SUN_ORBIT_YOJANAS = 4_331_500.0
#: Yojanas per minute of arc on the Moon's orbit (IV.3: "divide by 15").
YOJANAS_PER_MINUTE = 15.0
#: The Moon's greatest latitude, in minutes (I.68).
MOON_MAX_LATITUDE_MINUTES = 270.0

MEAN_DAILY_MOTION = {
    "sun": 360.0 * REVS_MAHAYUGA["sun"] / MAHAYUGA_DAYS,
    "moon": 360.0 * REVS_MAHAYUGA["moon"] / MAHAYUGA_DAYS,
}

#: Lunations searched before giving up on finding an eclipse (several per year occur).
_MAX_LUNATIONS = 48
_SYNODIC_DAYS = 29.530588


def elongation(jd_ut: float) -> float:
    """Moon − Sun, degrees [0, 360)."""
    return _wrap(true_position("moon", jd_ut)[0] - true_position("sun", jd_ut)[0])


def next_syzygy(jd_ut: float, target: float, *, backward: bool = False) -> float:
    """JD of the next (or previous) moment the elongation equals *target* (0 new, 180 full)."""
    now = elongation(jd_ut)
    ahead = (target - now) % 360.0
    if backward:
        ahead = ahead - 360.0 if ahead > 1e-6 else -360.0
    elif ahead < 1e-6:
        ahead = 360.0
    t = jd_ut + ahead / (360.0 / _SYNODIC_DAYS)
    for _ in range(8):
        _, moon_speed = true_longitude_and_speed("moon", t)
        _, sun_speed = true_longitude_and_speed("sun", t)
        step = _signed(target - elongation(t)) / (moon_speed - sun_speed)
        t += step
        if abs(step) < 1e-7:
            break
    return t


def moon_latitude_minutes(jd_ut: float) -> float:
    """The Moon's latitude in minutes, north positive."""
    return true_position("moon", jd_ut)[1] * 60.0


def eclipse_measures(jd_ut: float) -> dict[str, float]:
    """The discs of Sun and Moon, the Earth's shadow and the relative motion, in minutes.

    IV.2–5: each body's diameter is scaled by its true over mean daily motion; the
    Sun's is brought to the Moon's orbit; the shadow is the सूची (the Earth's
    diameter scaled like the Moon's) less the Sun's excess over the Earth, scaled
    by the Moon's diameter over the Sun's.
    """
    _, moon_speed = true_longitude_and_speed("moon", jd_ut)
    _, sun_speed = true_longitude_and_speed("sun", jd_ut)
    moon_ratio = moon_speed / MEAN_DAILY_MOTION["moon"]
    sun_ratio = sun_speed / MEAN_DAILY_MOTION["sun"]
    sun_yojanas = SUN_DIAMETER_YOJANAS * sun_ratio
    moon_yojanas = MOON_DIAMETER_YOJANAS * moon_ratio
    suchi = EARTH_DIAMETER_YOJANAS * moon_ratio
    shadow_yojanas = suchi - (sun_yojanas - EARTH_DIAMETER_YOJANAS) * MOON_DIAMETER_YOJANAS / SUN_DIAMETER_YOJANAS
    relative = (moon_speed - sun_speed) * 60.0  # minutes of arc per day
    return {
        "sun": sun_yojanas * MOON_ORBIT_YOJANAS / SUN_ORBIT_YOJANAS / YOJANAS_PER_MINUTE,
        "moon": moon_yojanas / YOJANAS_PER_MINUTE,
        "shadow": shadow_yojanas / YOJANAS_PER_MINUTE,
        "relative": relative,
        # The greatest parallax: four ghatis of the Moon's motion from the Sun (V.9).
        "parallax": relative / YOJANAS_PER_MINUTE,
    }


def _half_duration(middle: float, reach: float, relative: float, latitude_at, *, before: bool) -> float | None:
    """Half-duration in days for a contact at *reach* minutes, refined (IV.12–13).

    The text recomputes the Moon's latitude at the found contact and repeats; so
    does this, three times.
    """
    latitude = latitude_at(middle)
    if abs(latitude) >= reach:
        return None
    half = math.sqrt(reach * reach - latitude * latitude) / relative
    for _ in range(3):
        latitude = latitude_at(middle - half if before else middle + half)
        if abs(latitude) >= reach:
            return half
        half = math.sqrt(reach * reach - latitude * latitude) / relative
    return half


def lunar_eclipse_at(full_moon_jd: float) -> dict[str, Any] | None:
    """The lunar eclipse at this opposition, or None when the Moon passes clear of the shadow."""
    m = eclipse_measures(full_moon_jd)
    latitude = moon_latitude_minutes(full_moon_jd)
    half_sum = (m["shadow"] + m["moon"]) / 2.0
    if abs(latitude) >= half_sum:
        return None
    eclipsed = half_sum - abs(latitude)  # ग्रास
    total = eclipsed >= m["moon"]
    out: dict[str, Any] = {
        "kind": "lunar",
        "type": "total" if total else "partial",
        "max_jd": full_moon_jd,
        "magnitude": eclipsed / m["moon"],
        "partial_begin_jd": None,
        "partial_end_jd": None,
        "total_begin_jd": None,
        "total_end_jd": None,
        "penumbral_begin_jd": None,  # the text has no penumbra
        "penumbral_end_jd": None,
    }
    before = _half_duration(full_moon_jd, half_sum, m["relative"], moon_latitude_minutes, before=True)
    after = _half_duration(full_moon_jd, half_sum, m["relative"], moon_latitude_minutes, before=False)
    if before is not None and after is not None:
        out["partial_begin_jd"] = full_moon_jd - before
        out["partial_end_jd"] = full_moon_jd + after
    if total:
        half_difference = (m["shadow"] - m["moon"]) / 2.0
        before = _half_duration(full_moon_jd, half_difference, m["relative"], moon_latitude_minutes, before=True)
        after = _half_duration(full_moon_jd, half_difference, m["relative"], moon_latitude_minutes, before=False)
        if before is not None and after is not None:
            out["total_begin_jd"] = full_moon_jd - before
            out["total_end_jd"] = full_moon_jd + after
    return out


def _solar_type(sun: float, moon: float, latitude: float) -> str:
    if abs(latitude) < abs(moon - sun) / 2.0:
        return "total" if moon >= sun else "annular"
    return "partial"


def solar_eclipse_global(new_moon_jd: float) -> dict[str, Any] | None:
    """A solar eclipse somewhere on Earth: the Moon's parallax can carry her onto the Sun
    from some place when her latitude is under half the discs plus the greatest parallax."""
    m = eclipse_measures(new_moon_jd)
    latitude = moon_latitude_minutes(new_moon_jd)
    half_sum = (m["sun"] + m["moon"]) / 2.0
    if abs(latitude) >= half_sum + m["parallax"]:
        return None
    central = abs(latitude) < m["parallax"]
    return {
        "kind": "solar",
        "type": ("total" if m["moon"] >= m["sun"] else "annular") if central else "partial",
        "max_jd": new_moon_jd,
    }


def _nonagesimal_parallax(jd_ut: float, latitude: float, longitude: float, relative: float) -> tuple[float, float]:
    """(लम्बन in minutes of longitude, नति in minutes of latitude, north +) for the Moon.

    The greatest parallax P is four ghatis of the Moon's motion from the Sun (V.9).
    Its part in longitude is P·cos z·sin(λ − λ_V) and in latitude P·sin z, where V is
    the nonagesimal (त्रिभोन लग्न) and z its zenith distance — the altitude of the
    ecliptic's pole.
    """
    p = relative / YOJANAS_PER_MINUTE
    ayan = ayanamsha(jd_ut)
    nonagesimal = _wrap(ascendant_sayana(jd_ut, latitude, longitude) - 90.0)
    sun_sayana = _wrap(true_position("sun", jd_ut)[0] + ayan)
    # Altitude of the north ecliptic pole (RA 270°, dec 90° − obliquity).
    hour = math.radians(local_sidereal_degrees(jd_ut, longitude) - 270.0)
    phi, dec = math.radians(latitude), math.radians(90.0 - OBLIQUITY)
    pole_altitude = math.asin(math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.cos(hour))
    in_longitude = p * math.cos(pole_altitude) * math.sin(math.radians(sun_sayana - nonagesimal))
    in_latitude = -p * math.sin(pole_altitude)
    return in_longitude, in_latitude


def solar_eclipse_local(new_moon_jd: float, latitude: float, longitude: float) -> dict[str, Any]:
    """The eclipse as seen from one place: the middle moved by लम्बन, the latitude by नति."""
    m = eclipse_measures(new_moon_jd)
    middle = new_moon_jd
    for _ in range(4):  # the text iterates the लम्बन until it settles
        shift, _ = _nonagesimal_parallax(middle, latitude, longitude, m["relative"])
        middle = new_moon_jd - shift / m["relative"]

    def apparent_latitude(t: float) -> float:
        return moon_latitude_minutes(t) + _nonagesimal_parallax(t, latitude, longitude, m["relative"])[1]

    half_sum = (m["sun"] + m["moon"]) / 2.0
    at_middle = apparent_latitude(middle)
    sun_up = altitude("sun", middle, latitude, longitude) > 0.0
    if abs(at_middle) >= half_sum:
        return {"visible": False}
    before = _half_duration(middle, half_sum, m["relative"], apparent_latitude, before=True)
    after = _half_duration(middle, half_sum, m["relative"], apparent_latitude, before=False)
    return {
        "visible": sun_up,
        "local_type": _solar_type(m["sun"], m["moon"], at_middle),
        "local_max_jd": middle,
        "local_begin_jd": None if before is None else middle - before,
        "local_end_jd": None if after is None else middle + after,
        "local_magnitude": (half_sum - abs(at_middle)) / m["sun"],
    }


def next_eclipse(jd_ut: float, kind: str, *, backward: bool = False) -> dict[str, Any] | None:
    """The next (or previous) lunar or solar eclipse after *jd_ut*, by the text's rules."""
    target = 180.0 if kind == "lunar" else 0.0
    t = jd_ut
    for _ in range(_MAX_LUNATIONS):
        t = next_syzygy(t, target, backward=backward)
        found = lunar_eclipse_at(t) if kind == "lunar" else solar_eclipse_global(t)
        if found is not None:
            return found
        t += -1.0 if backward else 1.0
    return None
