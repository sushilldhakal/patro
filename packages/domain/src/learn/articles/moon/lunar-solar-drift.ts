import type { ArticleData } from "../../article-schema";

export const lunarSolarDrift: ArticleData = {
  slug: "lunar-solar-drift",
  seeAlso: ["adhik-kshaya-maas", "lunar-month", "chandramana"],
  sections: [
    {
      title: { ne: "वर्षमा ११ दिनको खाडल", en: "The eleven-day gap each year" },
      eyebrow: "354 vs 365",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "समस्या सरल अङ्कगणितबाट सुरु हुन्छ। सौर वर्ष र बाह्र चान्द्र मास बराबर छैनन्।",
            en: "The problem starts with simple arithmetic. A solar year and twelve lunar months are not the same length.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "365.24",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सौर वर्ष", en: "Solar year" },
              desc: { ne: "ऋतु र सङ्क्रान्तिको चक्र।", en: "The cycle of seasons and sankrantis." },
            },
            {
              big: "354.37",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "चान्द्र वर्ष", en: "Lunar year" },
              desc: { ne: "१२ × २९.५३ — तिथि र पर्वको चक्र।", en: "12 × 29.53 — the cycle of tithis and festivals." },
            },
            {
              big: "10.87",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "वार्षिक फरक", en: "Gap per year" },
              desc: { ne: "हरेक वर्ष चान्द्र पात्रो यति दिन अगाडि सर्छ।", en: "The lunar calendar runs ahead by this much every year." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "फरक जम्मा हुँदै जान्छ", en: "The gap accumulates" },
      eyebrow: "Three years, one month",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक वर्षको `११` दिन ठूलो देखिँदैन। तर यो हरेक वर्ष थपिँदै जान्छ।",
            en: "Eleven days in a year does not look like much. But it adds on, year after year.",
          },
        },
        {
          kind: "diagram",
          id: "lunar-solar-gap",
        },
        {
          kind: "para",
          text: {
            ne: "सुधार नगरे के हुन्थ्यो? दसैँ हरेक वर्ष `११` दिन सर्दै जान्थ्यो — नौ वर्षमा तीन महिना, र करिब `३३` वर्षमा पूरै वर्ष घुमेर फर्किन्थ्यो। शरद्‌को पर्व वर्षामा पर्थ्यो।",
            en: "Left uncorrected, Dashain would move `11` days earlier every year — three months in nine years, and a full lap of the year in about `33`. An autumn festival would end up in the monsoon.",
          },
        },
      ],
    },
    {
      title: { ne: "समाधान — मास थप्ने र घटाउने", en: "The fix — insert a month, or drop one" },
      eyebrow: "Intercalation",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "समाधान चलाखीपूर्ण छ: चान्द्र मासको लम्बाइ नबदली, बीचमा **एउटा थप मास** राखिन्छ। यसलाई ~अन्तर्वेशन~ भनिन्छ।",
            en: "The fix is neat: without altering the length of a lunar month, an **extra month** is inserted. This is ~intercalation~.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "अधिक मास", en: "Adhika māsa" },
              p: {
                ne: "झन्डै हरेक `३२.५` महिनामा एक थप मास — जम्मा भएको `३०`+ दिनको फरक एकैचोटि मिल्छ।",
                en: "An extra month roughly every `32.5` months — clearing the accumulated `30`+ day gap in one step.",
              },
            },
            {
              h: { ne: "क्षय मास", en: "Kṣaya māsa" },
              p: {
                ne: "दुर्लभ अवस्थामा एक मास घटाइन्छ — सूर्य द्रुत गतिमा हुँदा मात्र सम्भव।",
                en: "In rare cases a month is dropped — possible only when the Sun is moving at its fastest.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "कुन मास थप्ने भन्ने निर्णय अनुमानले होइन, **सङ्क्रान्तिको परीक्षण**ले हुन्छ: कुनै चान्द्र मासभित्र एउटै सङ्क्रान्ति परेन भने त्यो अधिक मास हो। यसरी चन्द्रको गणना सूर्यको स्थितिले नै नियन्त्रण गर्छ।",
            en: "Which month gets duplicated is not a guess but a **sankranti test**: a lunar month containing no sankranti at all is the extra one. In this way the Sun's position governs the Moon's count.",
          },
        },
        {
          kind: "diagram",
          id: "adhik-maas",
        },
        {
          kind: "note",
          text: {
            ne: "यही सन्तुलनले नेपाली पात्रोलाई *चान्द्र–सौर* बनाउँछ — पर्व चन्द्रले, ऋतु सूर्यले, र दुवै सँगै हिँड्छन्।",
            en: "This balancing act is what makes the Nepali calendar *lunisolar* — festivals from the Moon, seasons from the Sun, and the two kept walking together.",
          },
        },
      ],
    },
  ],
};
