import type { ArticleData } from "../../article-schema";

export const solarLongitude: ArticleData = {
  slug: "solar-longitude",
  seeAlso: ["lunar-longitude", "ecliptic", "calc-sankranti", "sauramana"],
  sections: [
    {
      title: { ne: "सूर्यको देशान्तर — पात्रोको मूल सङ्ख्या", en: "Solar longitude — the calendar's core number" },
      eyebrow: "0° to 360°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*सौर देशान्तर* क्रान्तिवृत्तमा सूर्यको स्थान हो, `०°` देखि `३६०°` सम्म नापिने। नेपाली पात्रोको झन्डै सबै कुरा यही एउटा सङ्ख्याबाट निस्कन्छ।",
            en: "*Solar longitude* is the Sun's place along the ecliptic, measured from `0°` to `360°`. Almost everything in the Nepali calendar follows from this single number.",
          },
        },
        {
          kind: "list",
          items: [
            { ne: "देशान्तर ÷ `३०°` → **कुन राशि**, अर्थात् कुन नेपाली महिना", en: "longitude ÷ `30°` → **which rashi**, hence which Nepali month" },
            { ne: "`३०°` को गुणाङ्क छुने क्षण → **सङ्क्रान्ति**", en: "the instant it crosses a multiple of `30°` → a **sankranti**" },
            { ne: "सङ्क्रान्तिदेखिका दिन → **गते**", en: "days since that crossing → the **gate**" },
            { ne: "चन्द्रको देशान्तरसँग घटाउ → **तिथि**; जोड → **योग**", en: "subtracted from the Moon's → **tithi**; added to it → **yoga**" },
          ],
        },
      ],
    },
    {
      title: { ne: "निरयन कि सायन?", en: "Sidereal or tropical?" },
      eyebrow: "Subtract the ayanamsha",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "खगोलीय गणनाले सामान्यतया **सायन** देशान्तर दिन्छ — वसन्त विषुवबाट नापिएको। वैदिक पात्रोलाई **निरयन** चाहिन्छ।",
            en: "Astronomical computation normally yields the **tropical** longitude, measured from the vernal equinox. The Vedic calendar needs the **sidereal** one.",
          },
        },
        {
          kind: "diagram",
          id: "two-zero-points",
        },
        {
          kind: "para",
          text: {
            ne: "यही एउटा घटाउले नेपाली नयाँ वर्षलाई मार्चको अन्त्यबाट अप्रिल मध्यमा सार्छ। अयनांशको मान कुन प्रणाली (लाहिरी, रमन, केपी) प्रयोग गर्ने भन्नेमा निर्भर हुन्छ; नेपालको आधिकारिक पात्रो **लाहिरी** प्रयोग गर्छ।",
            en: "That one subtraction is what moves the Nepali new year from late March to mid-April. Its value depends on which system is used — Lahiri, Raman, KP — and Nepal's official calendar uses **Lahiri**.",
          },
        },
      ],
    },
    {
      title: { ne: "गति स्थिर नभएकाले", en: "Because the rate is not steady" },
      eyebrow: "Mean vs true",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि सूर्य ठ्याक्कै `१°` प्रति दिनको दरले हिँड्थ्यो भने देशान्तर निकाल्न साधारण गुणन पुग्थ्यो। तर हिँड्दैन।",
            en: "If the Sun advanced by exactly `1°` a day, finding its longitude would be simple multiplication. It does not.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पृथ्वीको कक्ष अण्डाकार भएकाले सूर्यको देखिने गति `०.९५३°` देखि `१.०१९°` प्रति दिनसम्म घटबढ हुन्छ। त्यसैले **मध्यम** (औसत) स्थानबाट **स्पष्ट** (वास्तविक) स्थानमा पुग्न सुधार आवश्यक हुन्छ।",
            en: "Because Earth's orbit is elliptical, the Sun's apparent rate swings between `0.953°` and `1.019°` a day. Getting from the **mean** position to the **true** one therefore requires a correction.",
          },
        },
        {
          kind: "diagram",
          id: "earth-orbit",
        },
        {
          kind: "note",
          text: {
            ne: "सिद्धान्त ग्रन्थले यसलाई *मन्द फल* भन्थे र ज्या (sine) तालिकाबाट निकाल्थे। आधुनिक गणनाले उही काम ग्रहपात (ephemeris) बाट गर्छ — विधि फरक, उद्देश्य उही।",
            en: "The siddhantas called this the *manda phala* and derived it from sine tables. Modern computation does the same job from an ephemeris — different method, identical purpose.",
          },
        },
      ],
    },
  ],
};
