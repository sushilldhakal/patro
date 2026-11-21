"""Raw Swiss Ephemeris values from pyswisseph, for crates/ephemeris/tests/swe_golden.rs.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_swe_golden.py
"""

import json
import os
import random
import sys
from pathlib import Path

sys.path.insert(0, os.getcwd())
import swisseph as swe  # noqa: E402

from engine.astronomy.paths import ephemeris_path  # noqa: E402

swe.set_ephe_path(str(ephemeris_path()))
rng = random.Random(20261122)
jds = [2451545.0, 2461000.25, 1721425.5, 625000.5, 2818000.5, 0.0, -1000000.0, 5000000.0, 7000000.0]
jds += [rng.uniform(-3000000, 7900000) for _ in range(25)] + [rng.uniform(2400000, 2500000) for _ in range(25)]
modes = {"lahiri": swe.SIDM_LAHIRI, "raman": swe.SIDM_RAMAN, "kp": swe.SIDM_KRISHNAMURTI,
         "true_citra": swe.SIDM_TRUE_CITRA, "true_pushya": swe.SIDM_TRUE_PUSHYA}
calc, aya, asc, rise, teq, pheno = [], [], [], [], [], []
for jd in jds:
    for body in (0, 1, 2, 3, 4, 5, 6, 10, -1):
        for flags, mode in ((swe.FLG_SPEED, None), (swe.FLG_SPEED | swe.FLG_EQUATORIAL, None),
                            *((swe.FLG_SIDEREAL | swe.FLG_SPEED, m) for m in modes.values())):
            if body == -1 and flags != swe.FLG_SPEED:
                continue
            if mode is not None:
                swe.set_sid_mode(mode)
            try:
                xx = list(swe.calc_ut(jd, body, flags)[0])
                calc.append({"jd": jd, "body": body, "flags": flags, "mode": mode, "xx": xx})
            except swe.Error as e:
                calc.append({"jd": jd, "body": body, "flags": flags, "mode": mode, "error": str(e)})
    for m in modes.values():
        swe.set_sid_mode(m)
        try:
            aya.append({"jd": jd, "mode": m, "value": swe.get_ayanamsa_ex_ut(jd, swe.FLG_SWIEPH)[1]})
        except swe.Error as e:
            aya.append({"jd": jd, "mode": m, "error": str(e)})
    for lat, lon in ((27.7172, 85.324), (40.7128, -74.006), (-33.87, 151.21), (69.65, 18.96)):
        try:
            asc.append({"jd": jd, "lat": lat, "lon": lon, "value": swe.houses(jd, lat, lon, b"P")[1][0]})
        except swe.Error:
            pass
    try:
        teq.append({"jd": jd, "value": swe.time_equ(jd)})
    except swe.Error:
        pass
    for body in (1, 2, 3, 4, 5, 6):
        try:
            pheno.append({"jd": jd, "body": body, "value": list(swe.pheno_ut(jd, body, swe.FLG_SWIEPH))[:5]})
        except swe.Error:
            pass
for jd in jds[:12] + [rng.uniform(2440000, 2480000) for _ in range(20)]:
    for lat, lon, alt in ((27.7172, 85.324, 1400.0), (40.7128, -74.006, 10.0), (69.65, 18.96, 0.0), (0.0, 0.0, 0.0)):
        for body in (0, 1):
            for rsmi in (swe.CALC_RISE, swe.CALC_SET):
                dip = -1.76 * (alt ** 0.5) / 60.0 if alt > 0 else 0.0
                try:
                    res = swe.rise_trans_true_hor(jd, body, rsmi, (lon, lat, alt), 1010.0, 10.0, dip)
                    rise.append({"jd": jd, "body": body, "rsmi": rsmi, "geo": [lon, lat, alt], "dip": dip,
                                 "value": None if res[0] < 0 else res[1][0]})
                except swe.Error as e:
                    rise.append({"jd": jd, "body": body, "rsmi": rsmi, "geo": [lon, lat, alt], "dip": dip, "error": str(e)})
out = {"version": swe.version, "calc": calc, "ayanamsa": aya, "ascendant": asc, "rise": rise, "time_equ": teq, "pheno": pheno}
dest = Path(__file__).resolve().parents[1] / "crates" / "ephemeris" / "tests" / "fixtures" / "swe_golden.json"
dest.write_text(json.dumps(out))
print(len(calc), len(aya), len(asc), len(rise), len(teq), len(pheno), "->", dest)
