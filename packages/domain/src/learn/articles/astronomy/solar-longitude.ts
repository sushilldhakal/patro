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
            ne: "गणनाले सायन देशान्तर दिन्छ। वैदिक पात्रोले अयनांश घटाएर निरयन निकाल्छ। पूरा विवरण [[sidereal-vs-tropical|निरयन र सायन]] मा छ, र त्यही घटाउले नयाँ वर्ष अप्रिलमा पार्ने कारण [[year-begins-baisakh|वर्ष बैशाखमा किन सुरु हुन्छ]] मा। नेपालको आधिकारिक पात्रो **लाहिरी** प्रयोग गर्छ।",
            en: "Computation yields a tropical longitude. The Vedic calendar subtracts the ayanamsha to get the sidereal one. The full account is [[sidereal-vs-tropical|sidereal and tropical]], and why that subtraction puts the new year in April is [[year-begins-baisakh|why the year begins in Baisakh]]. Nepal's official calendar uses **Lahiri**.",
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
            ne: "कक्ष अण्डाकार भएकाले गति स्थिर हुँदैन, त्यसैले **मध्यम** स्थानबाट **स्पष्ट** स्थानमा सुधार चाहिन्छ। त्यो घटबढ कति हो, र असार पुषभन्दा लामो किन हुन्छ, [[solar-year|सौर वर्ष]] मा छ।",
            en: "The orbit is an ellipse, so the rate is not steady and a **mean** place has to be corrected to the **true** one. The size of that swing, and why Asar runs longer than Poush, is in [[solar-year|the solar year]].",
          },
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
