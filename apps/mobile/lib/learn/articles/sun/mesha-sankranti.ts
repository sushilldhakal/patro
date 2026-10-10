import type { ArticleData } from "../../article-schema";

export const meshaSankranti: ArticleData = {
  slug: "mesha-sankranti",
  seeAlso: ["year-begins-baisakh", "sankranti", "sauramana", "ritu-drift"],
  sections: [
    {
      title: { ne: "वर्षको शून्य बिन्दु", en: "The zero point of the year" },
      eyebrow: "0° of Mesha",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*मेष सङ्क्रान्ति* त्यो क्षण हो जब सूर्यको निरयन देशान्तर ठ्याक्कै `०°` हुन्छ — अर्थात् सूर्य मेष राशिको आरम्भमा पुग्छ। यो नेपाली नववर्ष, **बैशाख १ गते** हो।",
            en: "*Mesha Sankranti* is the instant the Sun's sidereal longitude reaches exactly `0°` — the start of Mesha. It is the Nepali new year, **Baisakh 1**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "बाह्र सङ्क्रान्तिमध्ये यसको विशेष स्थान छ, किनभने अरू सबै सङ्क्रान्तिले महिना मात्र सुरु गर्छन् — यसले **वर्ष** नै सुरु गर्छ।",
            en: "Of the twelve sankrantis this one is special: the others open only a month, while this one opens the **year**.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "0°",
              label: { ne: "निरयन देशान्तर", en: "Sidereal longitude" },
              desc: { ne: "राशिचक्रको आरम्भ बिन्दु — गणनाको शून्य।", en: "The zodiac's origin — the zero of the reckoning." },
            },
            {
              big: "1",
              unit: { ne: "गते", en: "gate" },
              label: { ne: "बैशाख", en: "Baisakh" },
              desc: { ne: "सङ्क्रान्ति पर्ने दिन नै महिनाको पहिलो गते।", en: "The day carrying the sankranti is the month's first gate." },
            },
            {
              big: "13–15",
              unit: { ne: "अप्रिल", en: "April" },
              label: { ne: "ग्रेगोरियन दायरा", en: "Gregorian window" },
              desc: { ne: "अयनांशका कारण मार्चको अन्त्यमा नभई अप्रिल मध्यमा पर्छ।", en: "Mid-April rather than late March, because of the ayanamsha." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "क्षण र दिन — फरक कुरा", en: "The instant and the day are not the same" },
      eyebrow: "The gate rule",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सङ्क्रान्ति एक **क्षण** हो — कुनै निश्चित घडी–मिनेटमा सूर्य सीमा नाघ्छ। तर पात्रोमा गते चाहिन्छ, क्षण होइन। त्यो क्षणलाई कुन दिनमा राख्ने भन्ने नियम चाहिन्छ।",
            en: "A sankranti is an **instant** — the Sun crosses the boundary at a definite hour and minute. But a calendar needs a day, not an instant, so a rule is required to assign it.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "नेपाली परम्पराले प्रयोग गर्ने नियम सरल छ: सङ्क्रान्तिको क्षण **मध्यरातअघि** परे त्यही दिन १ गते; मध्यरातपछि (अर्थात् भोलिपल्ट) परे भोलिपल्ट १ गते। यही कारण नयाँ वर्ष कुनै वर्ष `१३` अप्रिल, कुनै वर्ष `१४` मा पर्छ।",
            en: "The rule Nepali practice uses is simple: if the instant falls before midnight, that day is gate 1; if after, the next day is. This is why the new year lands on `13` April in one year and `14` in another.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण नेपाल र भारतका पात्रोमा एउटै सङ्क्रान्ति कहिलेकाहीँ फरक दिनमा देखिन्छ — क्षण उही, तर दिनमा राख्ने नियम फरक।",
            en: "It is also why the Nepali and Vedic calendars sometimes place the same sankranti on different days — the instant is shared, the assignment rule is not.",
          },
        },
      ],
    },
    {
      title: { ne: "नववर्ष अप्रिलमा नै किन", en: "Why the new year sits in April" },
      eyebrow: "The ayanamsha again",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सायन प्रणालीमा मेषको आरम्भ वसन्त विषुव — `२१` मार्चतिर। नेपाली पात्रो निरयन भएकाले त्यो बिन्दु ~अयनांश~ जति पछाडि सरेको हुन्छ।",
            en: "In the tropical system the start of Mesha is the vernal equinox, around `21` March. Because the Nepali calendar is sidereal, its Mesha sits behind that by the ~ayanamsha~.",
          },
        },
        {
          kind: "diagram",
          id: "two-zero-points",
        },
        {
          kind: "diagram",
          id: "ayanamsha-wheel",
        },
        {
          kind: "para",
          text: {
            ne: "अयनांश हरेक वर्ष करिब `५०` विकला (arc-seconds) बढ्ने हुनाले नववर्ष पनि शताब्दीयौँमा बिस्तारै पछाडि सर्दै जान्छ — हरेक `७२` वर्षमा झन्डै एक दिन।",
            en: "Since the ayanamsha grows by about `50` arc-seconds a year, the new year also creeps later across centuries — roughly one day every `72` years.",
          },
        },
      ],
    },
  ],
};
