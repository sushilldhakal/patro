"""Parashari divisional (varga) rashi from sidereal longitude."""

from __future__ import annotations

import math

VARGA_DIVISIONS = (
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60,
)


def _norm(longitude: float) -> float:
    return longitude % 360.0


def _sign_index(longitude: float) -> int:
    return int(_norm(longitude) // 30) % 12


def _deg_in_sign(longitude: float) -> float:
    return _norm(longitude) % 30.0


def _is_odd_sign(sign: int) -> bool:
    return sign % 2 == 0


def _modality(sign: int) -> int:
    return sign % 3


def drekkana_rashi_from_longitude(longitude: float) -> int:
    """D3 rashi 1–12: ((s + floor(d/10)*4) % 12) + 1."""
    s = _sign_index(longitude)
    d = _deg_in_sign(longitude)
    return ((s + int(d // 10) * 4) % 12) + 1


def navamsa_rashi_from_longitude(longitude: float) -> int:
    """D9 rashi 1–12: floor(lon*9/30) % 12 + 1."""
    lon = _norm(longitude)
    return (int(lon * 9 / 30) % 12) + 1


def varga_rashi_from_longitude(division: int, longitude: float) -> int:
    """Parashari divisional rashi (1–12) from sidereal longitude."""
    lon = _norm(longitude)
    s = _sign_index(lon)
    d = _deg_in_sign(lon)

    if division == 1:
        return s + 1
    if division == 2:
        half = 0 if d < 15 else 1
        if _is_odd_sign(s):
            return (5 if half == 0 else 4)
        return (4 if half == 0 else 5)
    if division == 3:
        return drekkana_rashi_from_longitude(lon)
    if division == 4:
        p = int(d // 7.5)
        return ((s + p) % 12) + 1
    if division == 5:
        p = int(d // 6)
        start = 0 if _is_odd_sign(s) else 6
        return ((start + p) % 12) + 1
    if division == 6:
        p = int(d // 5)
        return ((s + p) % 12) + 1
    if division == 7:
        p = int(math.floor(d / (30 / 7)))
        start = s if _is_odd_sign(s) else (s + 6) % 12
        return ((start + p) % 12) + 1
    if division == 8:
        p = int(d // 3.75)
        mod = _modality(s)
        start = 0 if mod == 0 else (4 if mod == 1 else 8)
        return ((start + p) % 12) + 1
    if division == 9:
        return navamsa_rashi_from_longitude(lon)
    if division == 10:
        p = int(d // 3)
        start = s if _is_odd_sign(s) else (s + 8) % 12
        return ((start + p) % 12) + 1
    if division == 11:
        p = int(math.floor(d / (30 / 11)))
        start = 0 if _is_odd_sign(s) else 6
        return ((start + p) % 12) + 1
    if division == 12:
        p = int(d // 2.5)
        return ((s + p) % 12) + 1
    if division == 16:
        p = int(math.floor(d / (30 / 16)))
        mod = _modality(s)
        start = 0 if mod == 0 else (4 if mod == 1 else 8)
        return ((start + p) % 12) + 1
    if division == 20:
        p = int(d // 1.5)
        mod = _modality(s)
        start = 0 if mod == 0 else (8 if mod == 1 else 4)
        return ((start + p) % 12) + 1
    if division == 24:
        p = int(d // 1.25)
        start = 4 if _is_odd_sign(s) else 3
        return ((start + p) % 12) + 1
    if division == 27:
        p = int(math.floor(d / (30 / 27)))
        mod = _modality(s)
        start = 0 if mod == 0 else (3 if mod == 1 else 6)
        return ((start + p) % 12) + 1
    if division == 30:
        if _is_odd_sign(s):
            if d < 5:
                return 1
            if d < 10:
                return 11
            if d < 18:
                return 9
            if d < 25:
                return 3
            return 7
        if d < 5:
            return 2
        if d < 12:
            return 6
        if d < 20:
            return 12
        if d < 25:
            return 10
        return 8
    if division == 40:
        p = int(d // 0.75)
        start = 0 if _is_odd_sign(s) else 6
        return ((start + p) % 12) + 1
    if division == 45:
        p = int(math.floor(d / (30 / 45)))
        mod = _modality(s)
        start = 0 if mod == 0 else (4 if mod == 1 else 8)
        return ((start + p) % 12) + 1
    if division == 60:
        p = int(d // 0.5)
        start = s if _is_odd_sign(s) else (s + 6) % 12
        return ((start + p) % 12) + 1
    return s + 1
