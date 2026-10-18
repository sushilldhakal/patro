/**
 * Long-form bilingual explanations for the standalone graha-detail pages
 * (ग्रह स्थिति, ग्रह अस्त, ग्रह वक्री, चन्द्र ग्रहण, सूर्य ग्रहण).
 *
 * Rendered at the bottom of each page — what it is, how it is computed, and
 * what it means — mirroring the panchanga-element description pattern.
 */

export interface BilingualText {
  ne: string;
  en: string;
}

export interface GrahaPageDescription {
  what: BilingualText;
  how: BilingualText;
  meaning: BilingualText;
}

export const GRAHA_PAGE_DESCRIPTIONS: Record<string, GrahaPageDescription> = {
  "graha-sthiti": {
    what: {
      ne: "ग्रह स्थिति भनेको दिइएको क्षणमा नौ ग्रह (सूर्य, चन्द्र, मङ्गल, बुध, बृहस्पति, शुक्र, शनि, राहु, केतु) र लग्नको ठ्याक्कै आकाशीय अवस्था हो। प्रत्येक ग्रहको राशि, नक्षत्र, पद, नक्षत्र स्वामी/उप स्वामी, पूर्ण डिग्री, शर (अक्षांश), गति, विषुवांश र क्रान्ति यहाँ देखाइन्छ।",
      en: "Graha sthiti is the precise celestial position of the nine grahas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Rahu, Ketu) and the ascendant (लग्न) at a given moment. Each planet's sign, nakshatra, pada, nakshatra lord/sub-lord, full degree, latitude (shara), speed, right ascension and declination are shown.",
    },
    how: {
      ne: "यी मान सूर्योदयको क्षणमा स्विस इफेमेरिसबाट गणना गरिन्छ। रेखांश र पूर्ण डिग्री लाहिरी अयनांश लगाएको निरयन (sidereal) देशान्तर हुन्; नक्षत्र, पद र स्वामी/उप स्वामी सोही निरयन देशान्तरबाट निकालिन्छ। शर (अक्षांश), विषुवांश र क्रान्ति क्रान्तिवृत्तबाट विषुवत् वृत्तमा रूपान्तरण गरेर आउँछ, जुन अयनांश-निरपेक्ष हुन्छ। ऋणात्मक गति (वक्री) र सूर्यसमीप अस्त पनि सङ्केत गरिन्छ।",
      en: "Values are computed at local sunrise from the Swiss Ephemeris. Rekhamsha and full degree are sidereal longitudes with the Lahiri ayanamsha applied; nakshatra, pada and lord/sub-lord are derived from that same sidereal longitude. Shara (latitude), right ascension and declination come from an ecliptic-to-equatorial transform and are ayanamsha-independent. Retrograde (negative speed) and combustion near the Sun are also flagged.",
    },
    meaning: {
      ne: "ग्रह स्थिति जन्मकुण्डली, गोचर, मुहूर्त र दैनिक फलादेशको आधार हो। नक्षत्र स्वामी र उप स्वामी KP (कृष्णमूर्ति पद्धति) मा घटनाको फल निर्धारण गर्न प्रयोग हुन्छ, र क्रान्तिले ग्रहको उत्तर/दक्षिण झुकाव देखाउँछ।",
      en: "Graha sthiti underpins the birth chart, transits (gochar), muhurta and daily prediction. The nakshatra lord and sub-lord are used in KP (Krishnamurti Paddhati) to judge results, while declination shows a planet's north/south tilt from the celestial equator.",
    },
  },
  "graha-asta": {
    what: {
      ne: "ग्रह अस्त भनेको ग्रह सूर्यको प्रखर किरणमा लुकेर आकाशमा नदेखिने अवस्था हो। ग्रह सूर्यभन्दा निश्चित कोणभन्दा नजिक पुग्दा अस्त (combust) हुन्छ र टाढा हुँदा पुनः उदय हुन्छ। यो पृष्ठमा वर्षभरका बुध, शुक्र, मङ्गल, बृहस्पति र शनिका अस्त अवधि, र चन्द्रमाको हरेक महिनाको 'चन्द्र तारा अस्त' (अमावस्या नजिकको अस्त) देखाइन्छ।",
      en: "Graha asta is when a planet is lost in the Sun's glare and invisible in the sky. A planet becomes asta (combust) when it comes within a set angle of the Sun and rises again (udaya) when it moves away. This page lists the yearly asta windows for Mercury, Venus, Mars, Jupiter and Saturn, plus the Moon's monthly 'Chandra Tara Asta' (combustion near the new moon).",
    },
    how: {
      ne: "ग्रहका लागि सूर्यसँगको निरयन कोणीय अन्तर (elongation) गणना गरिन्छ; यो अन्तर सूर्य सिद्धान्तको ग्रह-विशेष सीमा (बृहस्पति ~११°, शुक्र ~१०°) भन्दा तल झर्दा अस्त, माथि उठ्दा उदय हुन्छ। चन्द्र तारा अस्त हरेक अमावस्या वरिपरि हुन्छ — चन्द्रमा सूर्यबाट १३° भित्र आउने दिनहरूमा अस्त मानिन्छ; अवधि पहिलो दिनको चन्द्रोदयदेखि अन्तिम दिनको चन्द्रास्तसम्म रहन्छ।",
      en: "For planets, the sidereal elongation from the Sun is computed; when it drops below the Surya-Siddhanta graha-specific threshold (Jupiter ~11°, Venus ~10°) the planet is asta, and udaya when it rises above. Chandra Tara Asta recurs at every new moon — the Moon counts as combust on the days it lies within 13° of the Sun, with the window running from that first day's moonrise to the last day's moonset.",
    },
    meaning: {
      ne: "अस्त अवस्थाका ग्रहको बल घट्छ, त्यसैले विवाह, व्रतबन्ध जस्ता शुभ कार्यमा गुरु र शुक्र अस्त हुँदा मुहूर्त वर्जित मानिन्छ। चन्द्र तारा अस्तलाई पनि केही शुभकार्यमा वर्जित गरिन्छ। उदय भएपछि ग्रह पुनः बलियो र शुभ मानिन्छ।",
      en: "A combust planet is considered weak, so auspicious rites such as marriage and bratabandha are barred when Jupiter or Venus is asta (Guru/Shukra Tara Asta). Chandra Tara Asta is likewise avoided for some auspicious work. Once a body rises again it is regarded as strong and auspicious.",
    },
  },
  "graha-vakri": {
    what: {
      ne: "ग्रह वक्री भनेको पृथ्वीबाट हेर्दा ग्रह राशिचक्रमा पछाडितिर (उल्टो) हिँडेजस्तो देखिने अवस्था हो। यो आभासी गति हो — पृथ्वी र ग्रहको सापेक्ष गतिका कारण। ग्रह सामान्य (अगाडि) दिशामा फर्किंदा मार्गी भनिन्छ। यो पृष्ठमा वर्षभरका बुध, शुक्र, मङ्गल, बृहस्पति र शनिका वक्री–मार्गी क्षण देखाइन्छ।",
      en: "Graha vakri (retrograde) is when a planet appears to move backward through the zodiac as seen from Earth. It is an apparent motion caused by the relative speeds of Earth and the planet. When the planet resumes forward motion it is margi (direct). This page lists the vakri/margi station moments through the year for Mercury, Venus, Mars, Jupiter and Saturn.",
    },
    how: {
      ne: "प्रत्येक ग्रहको दैनिक गति (°/दिन) को चिन्ह अनुगमन गरिन्छ। गति धनात्मकबाट ऋणात्मक हुँदा वक्री आरम्भ (वक्री station) र ऋणात्मकबाट धनात्मक हुँदा मार्गी हुन्छ। चिन्ह परिवर्तन हुने ठ्याक्कै क्षण द्विखण्डन विधिबाट निकालिन्छ।",
      en: "The sign of each planet's daily speed (°/day) is tracked. When the speed turns from positive to negative the planet begins retrograde (vakri station); from negative to positive it turns direct (margi). The exact instant of the sign change is found by bisection.",
    },
    meaning: {
      ne: "वक्री ग्रहको फल परम्परागत ज्योतिषमा तीव्र वा परिवर्तित मानिन्छ र गोचर विचारमा महत्त्वपूर्ण छ। बुध वक्री सञ्चार र यात्रामा, शनि वक्री दीर्घकालीन कर्ममा प्रभाव पार्ने विश्वास गरिन्छ।",
      en: "A retrograde planet's effects are traditionally seen as intensified or altered, and matter in transit analysis. Mercury retrograde is associated with communication and travel, and Saturn retrograde with long-term karma.",
    },
  },
  "surya-grahan": {
    what: {
      ne: "सूर्य ग्रहण भनेको चन्द्रमा पृथ्वी र सूर्यको बीचमा आउँदा चन्द्रमाको छायाँले सूर्यलाई पूर्ण वा आंशिक रूपमा ढाक्ने खगोलीय घटना हो। यो सधैं औंसीका दिन हुन्छ। यो पृष्ठमा दिइएको वर्षका सूर्य ग्रहणहरू — तिनको प्रकार र नेपालबाट देखिने/नदेखिने — देखाइन्छ।",
      en: "A solar eclipse is when the Moon passes between the Earth and the Sun, and the Moon's shadow fully or partially covers the Sun. It always occurs on a new moon (Aaushi). This page lists the year's solar eclipses — their type and whether they are visible from Nepal.",
    },
    how: {
      ne: "स्विस इफेमेरिसका ग्रहण-खोज कार्यले वर्षभित्रका सूर्य ग्रहणका चरम क्षण, प्रकार (पूर्ण, वलयाकार, सङ्कर वा आंशिक) र दिइएको स्थानबाट देखिने–नदेखिने अवस्था गणना गर्छ। दृश्य भएका ग्रहणका लागि स्थानीय स्पर्श (आरम्भ) र मोक्ष (अन्त्य) समय पनि देखाइन्छ।",
      en: "The Swiss Ephemeris eclipse-search routines compute each solar eclipse's maximum instant, type (total, annular, hybrid or partial) and local visibility for the given location within the year. For visible eclipses the local first contact (begin) and last contact (end) times are shown.",
    },
    meaning: {
      ne: "धर्मशास्त्रअनुसार ग्रहणकाल अशुभ मानिन्छ; ग्रहणको सूतक (पूर्वाभास) काल सूर्य ग्रहणमा प्रायः १२ घण्टा अगाडि सुरु हुन्छ। यस अवधिमा शुभ कार्य, भोजन र मूर्तिस्पर्श वर्जित गरी जप, दान र स्नानलाई फलदायी मानिन्छ।",
      en: "In dharmashastra the eclipse period is considered inauspicious; the sutaka (fore-period) of a solar eclipse usually begins about 12 hours earlier. During it, auspicious acts, eating and touching idols are avoided, while chanting, charity and bathing are held to be meritorious.",
    },
  },
  "chandra-grahan": {
    what: {
      ne: "चन्द्र ग्रहण भनेको पृथ्वी सूर्य र चन्द्रमाको बीचमा आउँदा पृथ्वीको छायाँले चन्द्रमालाई पूर्ण, आंशिक वा उपच्छाया रूपमा ढाक्ने घटना हो। यो सधैं पूर्णिमाका दिन हुन्छ। यो पृष्ठमा दिइएको वर्षका चन्द्र ग्रहणहरू — तिनको प्रकार र नेपालबाट देखिने/नदेखिने — देखाइन्छ।",
      en: "A lunar eclipse is when the Earth passes between the Sun and the Moon, and the Earth's shadow covers the Moon fully, partially or as a penumbral shading. It always occurs on a full moon (Purnima). This page lists the year's lunar eclipses — their type and whether they are visible from Nepal.",
    },
    how: {
      ne: "स्विस इफेमेरिसका ग्रहण-खोज कार्यले वर्षभित्रका चन्द्र ग्रहणका चरम क्षण, प्रकार (पूर्ण, आंशिक वा उपच्छाया) र दिइएको स्थानबाट चन्द्रमा क्षितिजमाथि छ/छैन (देखिने–नदेखिने) गणना गर्छ। दृश्य ग्रहणका लागि आंशिक ग्रहणको आरम्भ र अन्त्य समय पनि देखाइन्छ।",
      en: "The Swiss Ephemeris eclipse-search routines compute each lunar eclipse's maximum instant, type (total, partial or penumbral) and whether the Moon is above the horizon (visible) from the given location within the year. For visible eclipses the partial-phase begin and end times are shown.",
    },
    meaning: {
      ne: "चन्द्र ग्रहणको सूतक काल प्रायः ग्रहणभन्दा ९ घण्टा अगाडि सुरु हुन्छ। सूर्य ग्रहणजस्तै यस अवधिमा शुभ कार्य वर्जित गरी जप, दान र स्नान गरिन्छ। पूर्ण चन्द्रग्रहणमा चन्द्रमा रातो देखिने (‘रक्त चन्द्र’) हुन्छ।",
      en: "A lunar eclipse's sutaka period usually begins about 9 hours before the eclipse. As with a solar eclipse, auspicious acts are avoided and chanting, charity and bathing are performed. During a total lunar eclipse the Moon appears red (the ‘blood moon’).",
    },
  },
};
