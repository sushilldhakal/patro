"""Classical kundali yogas detected from D1 placements (whole-sign houses).

Where a yoga has several textual variants the most common software rule is
used; each row carries its rule in the description.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.graha_details import (
    graha_dignity,
    norm_lon,
    rashi_lord_key,
)
from engine.vedic.vargas import navamsa_rashi_from_longitude

SEVEN = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
NON_LUMINARY = ["mars", "mercury", "jupiter", "venus", "saturn"]
BENEFICS = ["mercury", "jupiter", "venus"]
MALEFICS = ["sun", "mars", "saturn", "rahu", "ketu"]
KENDRA = (1, 4, 7, 10)
UPACHAYA = (3, 6, 10, 11)


def _rashi_of(lon: float) -> int:
    return int(norm_lon(lon) // 30) + 1


def _count_from(base: int, target: int) -> int:
    """House 1-12 of rashi `target` counted from rashi `base`."""
    return (target - base) % 12 + 1


def _is_strong_dignity(graha: str, rashi: int) -> bool:
    return graha_dignity(graha, rashi) in ("exalted", "moolatrikona", "own")


def compute_kundali_yogas(
    lagna_rashi: int,
    planet_longitudes: dict[str, float],
    is_day_birth: bool | None = None,
    gulika_longitude: float | None = None,
) -> list[dict[str, Any]]:
    lon = planet_longitudes.get

    def rashi(g: str) -> int | None:
        value = lon(g)
        return _rashi_of(value) if value is not None else None

    def house(g: str) -> int | None:
        r = rashi(g)
        return _count_from(lagna_rashi, r) if r is not None else None

    def lord_of_house(n: int) -> str:
        return rashi_lord_key((lagna_rashi - 1 + n - 1) % 12 + 1)

    moon_rashi = rashi("moon")
    sun_rashi = rashi("sun")

    def from_moon(g: str) -> int | None:
        r = rashi(g)
        if moon_rashi is None or r is None:
            return None
        return _count_from(moon_rashi, r)

    def from_sun(g: str) -> int | None:
        r = rashi(g)
        if sun_rashi is None or r is None:
            return None
        return _count_from(sun_rashi, r)

    seven_houses = [h for h in (house(g) for g in SEVEN) if h is not None]
    all_seven_known = len(seven_houses) == len(SEVEN)

    def mutual_kendra(a: str, b: str) -> bool:
        ra, rb = rashi(a), rashi(b)
        return ra is not None and rb is not None and _count_from(ra, rb) in KENDRA

    def mahapurusha(g: str) -> bool:
        h, r = house(g), rashi(g)
        return h is not None and r is not None and h in KENDRA and _is_strong_dignity(g, r)

    def benefics_in_upachaya_from(base: int | None) -> bool:
        if base is None:
            return False
        for g in BENEFICS:
            r = rashi(g)
            if r is None or _count_from(base, r) not in UPACHAYA:
                return False
        return True

    # ── individual rules, in display order ──────────────────────────────────

    mars_house = house("mars")
    mangala_dosha = mars_house is not None and mars_house in (1, 4, 7, 8, 12)

    kala_sarpa = False
    rahu_lon = lon("rahu")
    ketu_lon = lon("ketu")
    if rahu_lon is not None and ketu_lon is not None and all_seven_known:
        def in_arc(value: float, start: float, end: float) -> bool:
            return (value - start) % 360.0 < (end - start) % 360.0

        sides = [in_arc(lon(g), rahu_lon, ketu_lon) for g in SEVEN]  # type: ignore[arg-type]
        kala_sarpa = all(sides) or not any(sides)

    lagna_mallika = (
        all_seven_known
        and len(set(seven_houses)) == 7
        and all(h <= 7 for h in seven_houses)
    )

    jup_from_moon = from_moon("jupiter")
    gajakesari = jup_from_moon is not None and jup_from_moon in KENDRA

    second_from_moon = any(from_moon(g) == 2 for g in NON_LUMINARY)
    twelfth_from_moon = any(from_moon(g) == 12 for g in NON_LUMINARY)
    with_moon = any(from_moon(g) == 1 for g in NON_LUMINARY)
    sunapha = second_from_moon and not twelfth_from_moon
    anapha = twelfth_from_moon and not second_from_moon
    durdhara = second_from_moon and twelfth_from_moon
    kemadruma = (
        moon_rashi is not None
        and not second_from_moon
        and not twelfth_from_moon
        and not with_moon
    )

    chandra_mangala = (
        moon_rashi is not None and rashi("mars") is not None and moon_rashi == rashi("mars")
    )

    adhi = moon_rashi is not None and all(
        (from_moon(g) or 0) in (6, 7, 8) for g in BENEFICS
    ) and all(from_moon(g) is not None for g in BENEFICS)

    chatussagara = all(k in seven_houses for k in KENDRA)

    vasumati = benefics_in_upachaya_from(lagna_rashi) or benefics_in_upachaya_from(moon_rashi)

    rajalakshana = all(
        (house(g) or 0) in KENDRA and house(g) is not None
        for g in ("jupiter", "venus", "mercury", "moon")
    )

    vanchana_chora_bheeti = False
    if gulika_longitude is not None:
        gulika_rashi = _rashi_of(gulika_longitude)
        lagnesh_key = rashi_lord_key(lagna_rashi)
        vanchana_chora_bheeti = (
            gulika_rashi == lagna_rashi
            or gulika_rashi == rashi(lagnesh_key)
            or gulika_rashi == sun_rashi
            or gulika_rashi == moon_rashi
        )

    jup_rashi = rashi("jupiter")
    shakata = (
        moon_rashi is not None
        and jup_rashi is not None
        and _count_from(jup_rashi, moon_rashi) in (6, 8, 12)
    )

    amala = any(house(g) == 10 or from_moon(g) == 10 for g in BENEFICS)

    parvata = any((house(g) or 0) in KENDRA for g in BENEFICS) and all(
        house(g) is None or house(g) not in (7, 8) for g in MALEFICS
    )

    kahala = mutual_kendra(lord_of_house(4), lord_of_house(9))

    second_from_sun = any(from_sun(g) == 2 for g in NON_LUMINARY)
    twelfth_from_sun = any(from_sun(g) == 12 for g in NON_LUMINARY)
    veshi = second_from_sun and not twelfth_from_sun
    vasi = twelfth_from_sun and not second_from_sun
    obhayachari = second_from_sun and twelfth_from_sun

    budhaditya = (
        sun_rashi is not None and rashi("mercury") is not None and sun_rashi == rashi("mercury")
    )

    mahabhagya = False
    if is_day_birth is not None and sun_rashi is not None and moon_rashi is not None:
        def odd(r: int) -> bool:
            return r % 2 == 1

        if is_day_birth:
            mahabhagya = odd(lagna_rashi) and odd(sun_rashi) and odd(moon_rashi)
        else:
            mahabhagya = not odd(lagna_rashi) and not odd(sun_rashi) and not odd(moon_rashi)

    lagnesh = rashi_lord_key(lagna_rashi)
    pushkala = False
    if moon_rashi is not None:
        moon_dispositor = rashi_lord_key(moon_rashi)
        dr = rashi(moon_dispositor)
        lr = rashi(lagnesh)
        pushkala = (
            dr is not None
            and lr is not None
            and dr == lr
            and _count_from(lagna_rashi, dr) in KENDRA
        )

    lord9 = lord_of_house(9)
    lord9_rashi = rashi(lord9)
    lord9_house = _count_from(lagna_rashi, lord9_rashi) if lord9_rashi is not None else None
    lakshmi = (
        lord9_rashi is not None
        and lord9_house in (1, 4, 5, 7, 9, 10)
        and _is_strong_dignity(lord9, lord9_rashi)
    )

    gauri = (
        moon_rashi is not None
        and _is_strong_dignity("moon", moon_rashi)
        and jup_from_moon is not None
        and jup_from_moon in (1, 5, 7, 9)
    )

    bharati = False
    for n in (2, 5, 11):
        l_key = lord_of_house(n)
        l_lon = lon(l_key)
        if l_lon is None:
            continue
        navamsa_lord = rashi_lord_key(navamsa_rashi_from_longitude(l_lon))
        nr = rashi(navamsa_lord)
        if (
            nr is not None
            and graha_dignity(navamsa_lord, nr) == "exalted"
            and lord9_rashi is not None
            and nr == lord9_rashi
        ):
            bharati = True
            break

    chapa = all_seven_known and all(4 <= h <= 10 for h in seven_houses)

    lord7 = lord_of_house(7)
    lord7_rashi = rashi(lord7)
    shrinatha = (
        lord7_rashi is not None
        and _count_from(lagna_rashi, lord7_rashi) == 10
        and _is_strong_dignity(lord7, lord7_rashi)
    )

    shankha = mutual_kendra(lord_of_house(5), lord_of_house(6))

    bheri = (
        all_seven_known and all(h in (1, 2, 7, 12) for h in seven_houses)
    ) or (
        mutual_kendra("jupiter", "venus")
        and mutual_kendra("jupiter", lagnesh)
        and mutual_kendra("venus", lagnesh)
    )

    parijata = False
    lagnesh_rashi = rashi(lagnesh)
    if lagnesh_rashi is not None:
        dispositor = rashi_lord_key(lagnesh_rashi)
        dispositor_rashi = rashi(dispositor)
        if dispositor_rashi is not None:
            second = rashi_lord_key(dispositor_rashi)
            second_rashi = rashi(second)
            if second_rashi is not None:
                h = _count_from(lagna_rashi, second_rashi)
                parijata = h in (1, 4, 5, 7, 9, 10) or _is_strong_dignity(second, second_rashi)

    def y(key: str, name_en: str, name_ne: str, nature: str, present: bool,
          desc_en: str, desc_ne: str) -> dict[str, Any]:
        return {
            "key": key,
            "nameEn": name_en,
            "nameNe": name_ne,
            "nature": nature,
            "present": bool(present),
            "descEn": desc_en,
            "descNe": desc_ne,
        }

    return [
        y("mangala_dosha", "Mangala Dosha", "मंगल दोष", "inauspicious", mangala_dosha,
          "Mars occupies house 1, 4, 7, 8 or 12 from the lagna.",
          "लग्नबाट १, ४, ७, ८ वा १२ भावमा मंगल।"),
        y("kala_sarpa", "Kala Sarpa", "कालसर्प", "inauspicious", kala_sarpa,
          "All seven grahas lie on one side of the Rahu–Ketu axis.",
          "सबै सात ग्रह राहु–केतु अक्षको एकातर्फ।"),
        y("lagna_mallika", "Lagna Mallika", "लग्न मल्लिका", "auspicious", lagna_mallika,
          "The seven grahas occupy the seven consecutive houses from the lagna, one each.",
          "सात ग्रहले लग्नदेखि लगातार सात भाव एक-एक गरी ओगटेका।"),
        y("gajakesari", "Gajakesari", "गजकेसरी", "auspicious", gajakesari,
          "Jupiter in a kendra (1, 4, 7, 10) from the Moon.",
          "चन्द्रबाट केन्द्र (१, ४, ७, १०) मा बृहस्पति।"),
        y("sunapha", "Sunapha", "सुनफा", "auspicious", sunapha,
          "A graha (other than the Sun) in the 2nd from the Moon, with the 12th vacant.",
          "चन्द्रबाट दोस्रो भावमा ग्रह (सूर्यबाहेक), बाह्रौँ खाली।"),
        y("anapha", "Anapha", "अनफा", "auspicious", anapha,
          "A graha (other than the Sun) in the 12th from the Moon, with the 2nd vacant.",
          "चन्द्रबाट बाह्रौँ भावमा ग्रह (सूर्यबाहेक), दोस्रो खाली।"),
        y("durdhara", "Durdhara", "दुरुधरा", "auspicious", durdhara,
          "Grahas on both sides of the Moon (2nd and 12th).",
          "चन्द्रको दुवैतिर (दोस्रो र बाह्रौँ) ग्रह।"),
        y("kemadruma", "Kemadruma", "केमद्रुम", "inauspicious", kemadruma,
          "No graha with the Moon or in the 2nd/12th from it (Sun and nodes not counted).",
          "चन्द्रसँग वा दोस्रो/बाह्रौँमा कुनै ग्रह नभएको (सूर्य र राहु-केतु गनिँदैन)।"),
        y("chandra_mangala", "Chandra Mangala", "चन्द्र-मंगल", "auspicious", chandra_mangala,
          "Moon and Mars conjunct in one rashi.",
          "चन्द्र र मंगल एउटै राशिमा।"),
        y("adhi", "Adhi", "अधि", "auspicious", adhi,
          "The benefics Mercury, Jupiter and Venus occupy houses 6, 7 and 8 from the Moon.",
          "बुध, बृहस्पति र शुक्र चन्द्रबाट ६, ७, ८ भावमा।"),
        y("chatussagara", "Chatussagara", "चतुःसागर", "auspicious", chatussagara,
          "All four kendras from the lagna are occupied by grahas.",
          "लग्नबाट चारै केन्द्र ग्रहले ओगटेका।"),
        y("vasumati", "Vasumati", "वसुमती", "auspicious", vasumati,
          "All benefics in upachaya houses (3, 6, 10, 11) from the lagna or the Moon.",
          "सबै शुभ ग्रह लग्न वा चन्द्रबाट उपचय (३, ६, १०, ११) भावमा।"),
        y("rajalakshana", "Rajalakshana", "राजलक्षण", "auspicious", rajalakshana,
          "Jupiter, Venus, Mercury and the Moon all in kendras from the lagna.",
          "बृहस्पति, शुक्र, बुध र चन्द्र सबै लग्नबाट केन्द्रमा।"),
        y("vanchana_chora_bheeti", "Vanchana Chora Bheeti", "वञ्चन चोर भीति", "inauspicious",
          vanchana_chora_bheeti,
          "Gulika joins the lagna, the lagna lord, the Sun or the Moon.",
          "गुलिक लग्न, लग्नेश, सूर्य वा चन्द्रसँग।"),
        y("shakata", "Shakata", "शकट", "inauspicious", shakata,
          "Moon in the 6th, 8th or 12th from Jupiter.",
          "बृहस्पतिबाट ६, ८ वा १२ भावमा चन्द्र।"),
        y("amala", "Amala", "अमला", "auspicious", amala,
          "A benefic in the 10th from the lagna or the Moon.",
          "लग्न वा चन्द्रबाट दशौँ भावमा शुभ ग्रह।"),
        y("parvata", "Parvata", "पर्वत", "auspicious", parvata,
          "Benefics in kendras while houses 7 and 8 hold no malefic.",
          "केन्द्रमा शुभ ग्रह, ७ र ८ भावमा पापग्रह नभएको।"),
        y("kahala", "Kahala", "काहल", "auspicious", kahala,
          "Lords of the 4th and 9th houses in mutual kendras.",
          "चौथो र नवौँ भावका स्वामी परस्पर केन्द्रमा।"),
        y("veshi", "Veshi", "वेशी", "auspicious", veshi,
          "A graha (other than the Moon) in the 2nd from the Sun, with the 12th vacant.",
          "सूर्यबाट दोस्रो भावमा ग्रह (चन्द्रबाहेक), बाह्रौँ खाली।"),
        y("vasi", "Vasi", "वासी", "auspicious", vasi,
          "A graha (other than the Moon) in the 12th from the Sun, with the 2nd vacant.",
          "सूर्यबाट बाह्रौँ भावमा ग्रह (चन्द्रबाहेक), दोस्रो खाली।"),
        y("obhayachari", "Obhayachari", "उभयचरी", "auspicious", obhayachari,
          "Grahas on both sides of the Sun (2nd and 12th).",
          "सूर्यको दुवैतिर (दोस्रो र बाह्रौँ) ग्रह।"),
        y("hansa", "Hansa", "हंस", "auspicious", mahapurusha("jupiter"),
          "Jupiter exalted or in own sign, in a kendra from the lagna (Mahapurusha).",
          "बृहस्पति उच्च/स्वगृहमा, लग्नबाट केन्द्रमा (महापुरुष योग)।"),
        y("malavya", "Malavya", "मालव्य", "auspicious", mahapurusha("venus"),
          "Venus exalted or in own sign, in a kendra from the lagna (Mahapurusha).",
          "शुक्र उच्च/स्वगृहमा, लग्नबाट केन्द्रमा (महापुरुष योग)।"),
        y("shasha", "Shasha", "शश", "auspicious", mahapurusha("saturn"),
          "Saturn exalted or in own sign, in a kendra from the lagna (Mahapurusha).",
          "शनि उच्च/स्वगृहमा, लग्नबाट केन्द्रमा (महापुरुष योग)।"),
        y("ruchaka", "Ruchaka", "रुचक", "auspicious", mahapurusha("mars"),
          "Mars exalted or in own sign, in a kendra from the lagna (Mahapurusha).",
          "मंगल उच्च/स्वगृहमा, लग्नबाट केन्द्रमा (महापुरुष योग)।"),
        y("bhadra", "Bhadra", "भद्र", "auspicious", mahapurusha("mercury"),
          "Mercury exalted or in own sign, in a kendra from the lagna (Mahapurusha).",
          "बुध उच्च/स्वगृहमा, लग्नबाट केन्द्रमा (महापुरुष योग)।"),
        y("budhaditya", "Budhaditya", "बुधादित्य", "auspicious", budhaditya,
          "Sun and Mercury conjunct in one rashi.",
          "सूर्य र बुध एउटै राशिमा।"),
        y("mahabhagya", "Mahabhagya", "महाभाग्य", "auspicious", mahabhagya,
          "Day birth with lagna, Sun and Moon in odd signs — or night birth with all three in even signs.",
          "दिनको जन्ममा लग्न, सूर्य, चन्द्र विषम राशिमा — वा रातको जन्ममा तीनै सम राशिमा।"),
        y("pushkala", "Pushkala", "पुष्कल", "auspicious", pushkala,
          "The Moon's dispositor joins the lagna lord in a kendra.",
          "चन्द्र-राशिको स्वामी लग्नेशसँग केन्द्रमा।"),
        y("lakshmi", "Lakshmi", "लक्ष्मी", "auspicious", lakshmi,
          "The 9th lord exalted or in own sign, placed in a kendra or trikona.",
          "नवमेश उच्च/स्वगृहमा, केन्द्र वा त्रिकोणमा।"),
        y("gauri", "Gauri", "गौरी", "auspicious", gauri,
          "The Moon exalted or in own sign, joined or aspected by Jupiter.",
          "चन्द्र उच्च/स्वगृहमा, बृहस्पतिको युति वा दृष्टिमा।"),
        y("bharati", "Bharati", "भारती", "auspicious", bharati,
          "The navamsa dispositor of the 2nd, 5th or 11th lord is exalted and joined with the 9th lord.",
          "२, ५ वा ११ भावेशको नवांशेश उच्च भई नवमेशसँग।"),
        y("chapa", "Chapa", "चाप", "auspicious", chapa,
          "All seven grahas within houses 4 to 10 from the lagna (bow shape).",
          "सातै ग्रह लग्नबाट ४–१० भावभित्र (धनुष आकृति)।"),
        y("shrinatha", "Shrinatha", "श्रीनाथ", "auspicious", shrinatha,
          "The 7th lord exalted or in own sign, placed in the 10th house.",
          "सप्तमेश उच्च/स्वगृहमा दशौँ भावमा।"),
        y("shankha", "Shankha", "शंख", "auspicious", shankha,
          "Lords of the 5th and 6th houses in mutual kendras.",
          "पाँचौँ र छैटौँ भावका स्वामी परस्पर केन्द्रमा।"),
        y("bheri", "Bheri", "भेरी", "auspicious", bheri,
          "All grahas in houses 1, 2, 7 and 12 — or Jupiter, Venus and the lagna lord in mutual kendras.",
          "सबै ग्रह १, २, ७, १२ भावमा — वा बृहस्पति, शुक्र र लग्नेश परस्पर केन्द्रमा।"),
        y("parijata", "Parijata", "पारिजात", "auspicious", parijata,
          "The second-level dispositor of the lagna lord in a kendra/trikona, exalted or in own sign.",
          "लग्नेशको द्वितीय आश्रयदाता केन्द्र/त्रिकोणमा वा उच्च/स्वगृहमा।"),
    ]
