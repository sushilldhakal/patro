# Two ayanamsha variants, and where the engine uses each

**Found during Phase 9** by the definition-based golden suite: the first sankranti
comparison failed with a systematic ~150-second offset. That is 5.9 arcseconds of solar
motion — not convergence noise, a real longitude difference.

**Status: reported, not fixed.** Changing it moves the ascendant, which is a behaviour
change requiring approval (§4).

---

## 1. The two functions disagree

Swiss Ephemeris exposes two ayanamsha accessors, and they return different numbers:

| Epoch | `get_ayanamsa_ex_ut` − `get_ayanamsa_ut` |
|---|---|
| 3000 BCE | +5.843″ |
| 1 CE | +17.660″ |
| 1900 CE | +17.433″ |
| 2000 CE | **−13.932″** |
| 2026 CE | +5.916″ |

Note the sign flip: this is not a constant bias that would cancel.

**`get_ayanamsa_ex_ut` is the one that matches `FLG_SIDEREAL`** — verified to 0.000″. The
plain `_ut` variant takes no ephemeris flags and follows a different internal path.

So when computing a sidereal longitude, these two are equivalent:

```python
swe.calc_ut(jd, body, FLG_SWIEPH | FLG_SIDEREAL)[0][0]          # what production uses
swe.calc_ut(jd, body, FLG_SWIEPH)[0][0] - swe.get_ayanamsa_ex_ut(jd, FLG_SWIEPH)[1]
```

and this one is **not**:

```python
swe.calc_ut(jd, body, FLG_SWIEPH)[0][0] - swe.get_ayanamsa_ut(jd)   # off by 6–18″
```

## 2. Where the engine uses each

| Site | Method | Variant |
|---|---|---|
| `engine.py` `_calc(sidereal=True)` — **all planets, Sun, Moon** | `FLG_SIDEREAL` | **ex_ut** |
| `engine.py:476` `ascendant()` | `tropical_asc - get_ayanamsa_ut(jd)` | **_ut** |
| `engine.py:486` `ayanamsa()` — the value published in payloads | `get_ayanamsa_ut(jd)` | **_ut** |

**The planets and the ascendant are therefore computed against different ayanamshas.**

## 3. How much it matters

The ascendant moves ~15°/hour, so an 18″ longitude difference is ~1.2 seconds of lagna time:

| Epoch | Ascendant offset |
|---|---|
| 2026 CE | +0.39 s |
| 2000 CE | −0.93 s |
| 1 CE | +1.18 s |

Well inside the ~40″ ayanamsha-formula spread the engine already documents against Drik
Panchang (`engine.py:177`), and far below the minute-level resolution any payload prints.
**No published value is currently wrong because of this.**

The `ayanamsa` field published in day payloads carries the `_ut` value, which is *not* the
ayanamsha the planets in the same payload were computed with. That is the more defensible
thing to call a defect: the payload's own numbers are internally inconsistent, even though
the inconsistency is too small to be visible.

## 4. Decision required

| Option | Effect |
|---|---|
| **A. Leave it** | Zero risk. Two ayanamsha definitions persist; the published `ayanamsa` field stays inconsistent with the longitudes beside it. |
| **B. Move `ascendant()` and `ayanamsa()` to `get_ayanamsa_ex_ut`** ⬅ recommended | One definition engine-wide, and the published field matches the longitudes. **Changes the ascendant by ≤1.2 s of lagna and the published `ayanamsa` by ≤18″.** A lagna *rashi* could change only if the ascendant sat within 18″ of a sign boundary — roughly a 1-in-6000 chance per chart. Needs a `PANCHANGA_PAYLOAD_VERSION` bump. |
| C. Move planets to `_ut` | Wrong direction — `_ut` is the variant that does not match `FLG_SIDEREAL`. |

**Recommendation: B**, but it is a behaviour change and therefore a decision for the
maintainer, not a refactor to slip in.

Blast radius if B is taken: `ascendant()` feeds lagna, lagna_spans, the kundali chart and
every varga. The byte-identical harness covers lagna in the daily payload, so the diff
would be visible and reviewable; the four festival scenarios would be unaffected.

## 5. What already guards this

`tests/golden/definitions.py::ayanamsha` uses `get_ayanamsa_ex_ut` and documents why. The
sankranti golden dataset compares production against it, so if `_calc` ever switched
variants the comparison would fail with the same ~150 s signature that exposed this.
