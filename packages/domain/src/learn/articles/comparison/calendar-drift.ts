import type { ArticleData } from "../../article-schema";

export const calendarDrift: ArticleData = {
  slug: "calendar-drift",
  seeAlso: ["leap-years", "ritu-drift", "calendars-aligned-with-nature", "sidereal-vs-tropical"],
  sections: [
    {
      title: { ne: "सानो त्रुटि, ठूलो परिणाम", en: "Small error, large consequence" },
      eyebrow: "Why calendars drift",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "कुनै पनि पात्रोले खगोलीय चक्रलाई पूर्णाङ्क दिनमा अनुमान गर्नुपर्छ। त्यो अनुमान जति नै राम्रो भए पनि **कहिल्यै ठ्याक्कै हुँदैन** — र बाँकी रहेको सानो अंश शताब्दीयौँमा जम्मा हुन्छ।",
            en: "Every calendar must approximate an astronomical cycle in whole days. However good the approximation, it is **never exact** — and the small remainder accumulates over centuries.",
          },
        },
        {
          kind: "table",
          caption: { ne: "त्रुटिको दर र त्यसको परिणाम", en: "Rates of error and what they amount to" },
          headers: [
            { ne: "पात्रो", en: "Calendar" },
            { ne: "वार्षिक त्रुटि", en: "Error per year" },
            { ne: "१ दिन जम्मा हुन", en: "One day of drift in" },
          ],
          rows: [
            [
              { ne: "जुलियन", en: "Julian" },
              "+0.0078 दिन/day",
              { ne: "~१२८ वर्ष", en: "~128 years" },
            ],
            [
              { ne: "ग्रेगोरियन", en: "Gregorian" },
              "+0.0003 दिन/day",
              { ne: "~३,३०० वर्ष", en: "~3,300 years" },
            ],
            [
              { ne: "निरयन (ऋतुको सापेक्ष)", en: "Sidereal (against the seasons)" },
              "+0.0142 दिन/day",
              { ne: "~७२ वर्ष", en: "~72 years" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — तेस्रो पङ्क्ति **त्रुटि होइन**। निरयन पात्रोले ऋतु पछ्याउन खोजेकै छैन; यसले तारा पछ्याउँछ, र त्यसमा यो शुद्ध छ। “सर्नु” कुन कुराको सापेक्ष भनेर सोध्नुपर्छ।",
            en: "Note that the third row is **not an error**. A sidereal calendar is not trying to track the seasons; it tracks the stars, and at that it is exact. \"Drift\" always begs the question — drift against what?",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
        },
      ],
    },
    {
      title: { ne: "१५८२ को दस दिन", en: "The ten days of 1582" },
      eyebrow: "A calendar reform in practice",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "जुलियन पात्रोको `०.००७८` दिनको वार्षिक त्रुटि `१,२००` वर्षमा `१०` दिन बनिसकेको थियो। वसन्त विषुव `२१` मार्चको सट्टा `११` मार्चमा पर्न थालेको थियो।",
            en: "The Julian calendar's `0.0078`-day annual error had grown to `10` days over `1,200` years. The vernal equinox was arriving on `11` March instead of `21`.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "`१५८२` अक्टोबरमा यसलाई एकैचोटि सच्याइयो — `४` अक्टोबरको भोलिपल्ट **`१५` अक्टोबर** भयो। बीचका दस दिन कहिल्यै अस्तित्वमा आएनन्।",
            en: "In October `1582` it was corrected at a stroke — the day after `4` October was **`15` October**. The ten days in between never existed.",
          },
        },
        {
          kind: "diagram",
          id: "gregorian-jump",
        },
      ],
    },
    {
      title: { ne: "नेपाली पात्रोमा सुधार", en: "Reform in the Nepali calendar" },
      eyebrow: "Continuous, not sudden",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "बि.सं.मा त्यस्तो नाटकीय सुधार भएको छैन — किनभने यसको संरचना नै फरक छ। महिनाको लम्बाइ हरेक वर्ष गणनाबाट आउने भएकाले **सुधार निरन्तर हुन्छ**, एकैचोटि होइन।",
            en: "BS has seen no such dramatic reform, because its structure differs. Since month lengths are computed afresh each year, **correction is continuous** rather than sudden.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "तर एउटा कुरा निरन्तर बदलिन्छ — **अयनांशको मान**। यो हरेक वर्ष `~५०` विकलाले बढ्छ, र गणनामा प्रयोग हुने मान अद्यावधिक हुन्छ। यही निरयन पात्रोको मौन, क्रमिक समायोजन हो।",
            en: "One thing does change continuously, though — the **value of the ayanamsha**. It grows by `~50` arc-seconds a year, and the figure used in computation is updated accordingly. That is a sidereal calendar's quiet, incremental adjustment.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यसको अर्थ — निरयन पात्रोमा ऋतु सर्नु टाल्नुपर्ने त्रुटि होइन, **छनोटको स्वीकृत परिणाम** हो। सुधार गर्नुपर्ने भए त्यो सन्दर्भ प्रणाली नै बदल्नु हुन्थ्यो, जुन परम्पराले गर्न चाहँदैन।",
            en: "So seasonal drift in a sidereal calendar is not a bug to be patched but **an accepted consequence of the choice**. Fixing it would mean changing the reference frame itself — which the tradition declines to do.",
          },
        },
      ],
    },
  ],
};
