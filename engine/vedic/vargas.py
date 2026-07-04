"""Parashari divisional (varga) charts — D1 through D60 sign mappings."""

from __future__ import annotations

import math

from engine.vedic.graha_details import _dms_from_deg_in_sign, norm_lon

VARGA_DIVISIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60]

# Trimsamsa degree bands within a sign (odd / even signs).
_D30_BANDS_ODD = [(0, 5), (5, 10), (10, 18), (18, 25), (25, 30)]
_D30_BANDS_EVEN = [(0, 5), (5, 12), (12, 20), (20, 25), (25, 30)]
_D30_SIGNS_ODD = [1, 11, 9, 3, 7]
_D30_SIGNS_EVEN = [2, 6, 12, 10, 8]


def navamsa_rashi_from_longitude(longitude: float) -> int:
    """Navamsa (D9) rashi 1-12 from sidereal longitude in degrees."""
    lon = norm_lon(longitude)
    return int((lon * 9) // 30) % 12 + 1


def drekkana_rashi_from_longitude(longitude: float) -> int:
    """Drekkana (D3): each 10° maps to the 1st, 5th, 9th sign from the occupied one."""
    lon = norm_lon(longitude)
    sign = int(lon // 30)
    drekkana = int((lon - sign * 30) // 10)
    return (sign + drekkana * 4) % 12 + 1


def _modality(sign: int) -> int:
    return sign % 3


def varga_rashi_from_longitude(division: int, longitude: float) -> int:
    """Parashari divisional rashi (1-12) from sidereal longitude."""
    lon = norm_lon(longitude)
    s = int(lon // 30)  # 0-based sign
    d = lon % 30
    odd = s % 2 == 0

    if division == 1:
        return s + 1
    if division == 2:
        half = 0 if d < 15 else 1
        if odd:
            return 5 if half == 0 else 4
        return 4 if half == 0 else 5
    if division == 3:
        return drekkana_rashi_from_longitude(lon)
    if division == 4:
        return (s + int(d // 7.5)) % 12 + 1
    if division == 5:
        start = 0 if odd else 6
        return (start + int(d // 6)) % 12 + 1
    if division == 6:
        return (s + int(d // 5)) % 12 + 1
    if division == 7:
        p = int(d / (30 / 7))
        start = s if odd else (s + 6) % 12
        return (start + p) % 12 + 1
    if division == 8:
        p = int(d // 3.75)
        start = {0: 0, 1: 4, 2: 8}[_modality(s)]
        return (start + p) % 12 + 1
    if division == 9:
        return navamsa_rashi_from_longitude(lon)
    if division == 10:
        p = int(d // 3)
        start = s if odd else (s + 8) % 12
        return (start + p) % 12 + 1
    if division == 11:
        p = int(d / (30 / 11))
        start = 0 if odd else 6
        return (start + p) % 12 + 1
    if division == 12:
        return (s + int(d // 2.5)) % 12 + 1
    if division == 16:
        p = int(d / (30 / 16))
        start = {0: 0, 1: 4, 2: 8}[_modality(s)]
        return (start + p) % 12 + 1
    if division == 20:
        p = int(d // 1.5)
        start = {0: 0, 1: 8, 2: 4}[_modality(s)]
        return (start + p) % 12 + 1
    if division == 24:
        p = int(d // 1.25)
        start = 4 if odd else 3
        return (start + p) % 12 + 1
    if division == 27:
        p = int(d / (30 / 27))
        start = {0: 0, 1: 3, 2: 6}[_modality(s)]
        return (start + p) % 12 + 1
    if division == 30:
        bands = _D30_BANDS_ODD if odd else _D30_BANDS_EVEN
        signs = _D30_SIGNS_ODD if odd else _D30_SIGNS_EVEN
        for (lo, hi), sign in zip(bands, signs):
            if lo <= d < hi:
                return sign
        return signs[-1]
    if division == 40:
        p = int(d // 0.75)
        start = 0 if odd else 6
        return (start + p) % 12 + 1
    if division == 45:
        p = int(d / (30 / 45))
        start = {0: 0, 1: 4, 2: 8}[_modality(s)]
        return (start + p) % 12 + 1
    if division == 60:
        p = int(d // 0.5)
        start = s if odd else (s + 6) % 12
        return (start + p) % 12 + 1
    return s + 1


def varga_dms_parts(division: int, longitude: float) -> dict[str, int]:
    """Varga spashta: divisional sign plus scaled degrees within that varga sign."""
    lon = norm_lon(longitude)
    if division == 1:
        return _dms_from_deg_in_sign(int(lon // 30) + 1, lon % 30)
    rashi_num = varga_rashi_from_longitude(division, lon)
    d = lon % 30
    if division == 30:
        bands = _D30_BANDS_ODD if int(lon // 30) % 2 == 0 else _D30_BANDS_EVEN
        band = next(((lo, hi) for lo, hi in bands if lo <= d < hi), bands[-1])
        frac = (d - band[0]) / (band[1] - band[0])
    else:
        seg = 30.0 / division
        frac = math.fmod(d, seg) / seg
    return _dms_from_deg_in_sign(rashi_num, min(frac * 30.0, 30.0 - 1e-9))
